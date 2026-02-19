import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  async createRole(name: string, description: string | undefined, orgId: string, userId: string) {
    const role = await this.repo.createRole({ name, description, orgId });
    await this.auditService.log({ userId, orgId, module: 'roles', action: 'create_role', entityType: 'role', entityId: role.id });
    return role;
  }

  async listRoles(orgId: string) {
    return this.repo.findRolesByOrg(orgId);
  }

  async getRolePermissions(roleId: string) {
    return this.repo.getRolePermissions(roleId);
  }

  async grantPermissions(roleId: string, permissions: string[], orgId: string, userId: string) {
    const result = await this.repo.setRolePermissions(roleId, permissions);
    // Invalidate cached permissions for all users with this role
    await this.redisService.delPattern(`jl:permissions:*:${orgId}`);
    await this.auditService.log({ userId, orgId, module: 'roles', action: 'grant_permissions', entityType: 'role', entityId: roleId, newData: { permissions } });
    return result;
  }

  async assignRoleToUser(userId: string, roleId: string, orgId: string, assignedBy: string) {
    const result = await this.repo.assignUserRole({ userId, roleId, orgId });
    // Invalidate this user's permission cache
    await this.redisService.del(`jl:permissions:${userId}:${orgId}`);
    await this.auditService.log({ userId: assignedBy, orgId, module: 'roles', action: 'assign_role', entityType: 'user', entityId: userId, newData: { roleId } });
    return result;
  }

  async getUserRoles(userId: string, orgId: string) {
    return this.repo.getUserRoles(userId, orgId);
  }

  async deleteRole(id: string, orgId: string, userId: string) {
    const role = await this.repo.findRoleById(id);
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new ForbiddenException('Cannot delete system roles');
    if (role.orgId !== orgId) throw new ForbiddenException('Role does not belong to your organization');
    await this.repo.deleteRole(id);
    await this.redisService.delPattern(`jl:permissions:*:${orgId}`);
    await this.auditService.log({ userId, orgId, module: 'roles', action: 'delete_role', entityType: 'role', entityId: id });
  }
}
