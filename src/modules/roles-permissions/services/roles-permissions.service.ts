import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AppType } from '@prisma/client';
import { RolesPermissionsRepository } from '../repositories/roles-permissions.repository';
import { RedisService } from '../../../database/redis.service';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class RolesPermissionsService {
  constructor(
    private repo: RolesPermissionsRepository,
    private redisService: RedisService,
    private auditService: AuditService,
  ) {}

  async createRole(
    data: {
      name: string;
      description?: string;
      orgId?: string;
      isSystem?: boolean;
      isDefault?: boolean;
      targetUserType?: any;
      slug?: string;
      initialPermissions?: { featureId?: string; screenId?: string; actionId: string }[];
    },
    userId: string,
  ) {
    const role = await this.repo.createRole(data);
    await this.auditService.log({
      userId,
      orgId: data.orgId || null,
      appType: AppType.ADMIN_WEB,
      module: 'roles',
      action: 'create_role',
      entityType: 'role',
      entityId: role.id,
      newData: data,
    });
    return role;
  }

  async findDefaultRole(userType: any) {
    return this.repo.findDefaultRole(userType);
  }

  async cloneSystemRolesForOrg(orgId: string, actorId: string) {
    await this.repo.cloneSystemRoles(orgId);
    await this.auditService.log({
      userId: actorId,
      orgId,
      appType: AppType.ADMIN_WEB,
      module: 'roles',
      action: 'clone_system_roles',
      entityType: 'organization',
      entityId: orgId,
    });
  }

  async listRoles(orgId: string) {
    return this.repo.findRolesByOrg(orgId);
  }

  async getRolePermissions(roleId: string) {
    return this.repo.getRolePermissions(roleId);
  }

  async grantPermissions(
    roleId: string,
    permissions: { featureId?: string; screenId?: string; actionId: string }[],
    orgId: string,
    userId: string,
  ) {
    const result = await this.repo.setRolePermissions(roleId, permissions);
    // Invalidate cached permissions for all users with this role
    await this.redisService.delPattern(`jl:permissions:*:${orgId}`);
    await this.auditService.log({
      userId,
      orgId,
      appType: AppType.MAIN_WEB,
      module: 'roles',
      action: 'grant_permissions',
      entityType: 'role',
      entityId: roleId,
      newData: { permissions },
    });
    return result;
  }

  async assignRoleToUser(userId: string, roleId: string, orgId: string, assignedBy: string) {
    const result = await this.repo.assignUserRole({ userId, roleId, orgId });
    // Invalidate this user's permission cache
    await this.redisService.del(`jl:permissions:${userId}:${orgId}`);
    await this.auditService.log({
      userId: assignedBy,
      orgId,
      appType: AppType.MAIN_WEB,
      module: 'roles',
      action: 'assign_role',
      entityType: 'user',
      entityId: userId,
      newData: { roleId },
    });
    return result;
  }

  async getUserRoles(userId: string, orgId: string) {
    return this.repo.getUserRoles(userId, orgId);
  }

  async rebuildUserPermissionsCache(userId: string, orgId: string) {
    const userRoles = await this.repo.getUserRoles(userId, orgId);
    const permissionsSet = new Set<string>();

    for (const userRole of userRoles) {
      const role = (userRole as any).role;
      if (!role?.permissions) continue;

      for (const perm of role.permissions) {
        if (!perm.granted) continue;

        let key = '';
        if (perm.screenId && perm.screen) {
          key = `${perm.screen.key}.${perm.action.key}`;
        } else if (perm.featureId && perm.feature) {
          key = `${perm.feature.key}.${perm.action.key}`;
        }

        if (key) permissionsSet.add(key);
      }
    }

    const permissions = Array.from(permissionsSet);
    const cacheKey = `jl:permissions:${userId}:${orgId || 'system'}`;
    await this.redisService.set(cacheKey, permissions, 3600); // Cache for 1 hour
    return permissions;
  }

  async deleteRole(id: string, orgId: string, userId: string) {
    const role = await this.repo.findRoleById(id);
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new ForbiddenException('Cannot delete system roles');
    if (role.orgId !== orgId)
      throw new ForbiddenException('Role does not belong to your organization');
    await this.repo.deleteRole(id);
    await this.redisService.delPattern(`jl:permissions:*:${orgId}`);
    await this.auditService.log({
      userId,
      orgId,
      appType: AppType.MAIN_WEB,
      module: 'roles',
      action: 'delete_role',
      entityType: 'role',
      entityId: id,
    });
  }

  async updateRole(
    id: string,
    data: { name?: string; description?: string; isSystem?: boolean; isDefault?: boolean; targetUserType?: any },
    userId: string,
  ) {
    const role = await this.repo.findRoleById(id);
    if (!role) throw new NotFoundException('Role not found');

    // In many systems, system roles are partially protected
    if (role.isSystem && (data.name || data.isDefault)) {
  // Logic for system roles if needed
    }

    const updated = await this.repo.updateRole(id, data);

    await this.auditService.log({
      userId,
      orgId: updated.orgId || null,
      appType: AppType.ADMIN_WEB,
      module: 'roles',
      action: 'update_role',
      entityType: 'role',
      entityId: id,
      newData: data,
    });

    return updated;
  }

  async updateRolePermissions(
    roleId: string,
    permissions: { featureId?: string; screenId?: string; actionId: string }[],
    userId: string,
  ) {
    const role = await this.repo.findRoleById(roleId);
    if (!role) throw new NotFoundException('Role not found');

    const result = await this.repo.setRolePermissions(roleId, permissions);

    // Invalidate cache
    if (role.orgId) {
      await this.redisService.delPattern(`jl:permissions:*:${role.orgId}`);
    } else {
      // System role - might need to invalidate all caches if it's widely used, 
      // but usually users have org-specific copies or we use a separate pattern.
      await this.redisService.delPattern(`jl:permissions:*`);
    }

    await this.auditService.log({
      userId,
      orgId: role.orgId || null,
      appType: AppType.ADMIN_WEB,
      module: 'roles',
      action: 'update_permissions',
      entityType: 'role',
      entityId: roleId,
      newData: { permissions },
    });

    return result;
  }

  async getModules() {
    return this.repo.findModules();
  }

  async getScreens() {
    return this.repo.findScreens();
  }
}

