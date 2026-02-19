import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class RolesPermissionsRepository {
  constructor(private prisma: PrismaService) {}

  async createRole(data: { name: string; description?: string; orgId?: string; isSystem?: boolean; slug?: string }) {
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '_');
    const role = await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        orgId: data.orgId || null,
        isSystem: data.isSystem || false,
        slug,
      },
    });

    // Auto-seed permissions for new role (granted: false by default)
    const allFeatures = await this.prisma.feature.findMany({
      include: { actions: true },
    });

    if (allFeatures.length > 0) {
      const permissionData = [];
      for (const feature of allFeatures) {
        for (const action of feature.actions) {
          permissionData.push({
            roleId: role.id,
            featureId: feature.id,
            actionId: action.id,
            granted: data.isSystem ? slug === 'super_admin' : false,
          });
        }
      }

      if (permissionData.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: permissionData,
        });
      }
    }

    return role;
  }

  async findRoleById(id: string) {
    return this.prisma.role.findUnique({ where: { id } });
  }

  async findRolesByOrg(orgId: string) {
    return this.prisma.role.findMany({
      where: { OR: [{ orgId }, { orgId: null, isSystem: true }] },
      include: { _count: { select: { userRoles: true } } },
      orderBy: { isSystem: 'desc' },
    });
  }

  async getRolePermissions(roleId: string) {
    return this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { feature: { include: { module: true } }, action: true },
    });
  }

  async setRolePermissions(roleId: string, permissionIds: { featureId: string; actionId: string }[]) {
    // First, set all to false
    await this.prisma.rolePermission.updateMany({
      where: { roleId },
      data: { granted: false },
    });

    // Then set specific ones to true
    for (const perm of permissionIds) {
      await this.prisma.rolePermission.updateMany({
        where: { roleId, featureId: perm.featureId, actionId: perm.actionId },
        data: { granted: true },
      });
    }

    return { success: true };
  }

  async assignUserRole(data: { userId: string; roleId: string; orgId: string }) {
    return this.prisma.userRole.upsert({
      where: { userId_roleId_orgId: { userId: data.userId, roleId: data.roleId, orgId: data.orgId } },
      create: data,
      update: {},
    });
  }

  async getUserRoles(userId: string, orgId: string) {
    return this.prisma.userRole.findMany({
      where: { userId, orgId },
      include: { role: { include: { permissions: { include: { feature: true, action: true } } } } },
    });
  }

  async deleteRole(id: string) {
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.userRole.deleteMany({ where: { roleId: id } });
    return this.prisma.role.delete({ where: { id } });
  }
}
