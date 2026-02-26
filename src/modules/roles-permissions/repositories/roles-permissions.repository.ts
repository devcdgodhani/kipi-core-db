import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class RolesPermissionsRepository {
  constructor(private prisma: PrismaService) {}

  async createRole(data: {
    name: string;
    description?: string;
    orgId?: string;
    isSystem?: boolean;
    isDefault?: boolean;
    targetUserType?: any;
    slug?: string;
    initialPermissions?: { featureId?: string; screenId?: string; actionId: string }[];
  }) {
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '_');
    const role = await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        orgId: data.orgId || null,
        isSystem: data.isSystem || false,
        isDefault: data.isDefault || false,
        targetUserType: data.targetUserType || null,
        slug,
      },
    });

    // Seed permissions
    const [allFeatures, allScreens] = await Promise.all([
      this.prisma.feature.findMany({ include: { actions: true } }),
      this.prisma.screen.findMany({ include: { actions: true } }),
    ]);

    const permissionData = [];

    // Legacy Feature Permissions
    for (const feature of allFeatures) {
      for (const action of feature.actions) {
        const isGranted = data.initialPermissions?.some(
          (p) => p.featureId === feature.id && p.actionId === action.id,
        ) || (data.isSystem && slug === 'super_admin');

        permissionData.push({
          roleId: role.id,
          featureId: feature.id,
          actionId: action.id,
          granted: isGranted,
        });
      }
    }

    // New Screen Permissions
    for (const screen of allScreens) {
      for (const action of screen.actions) {
        const isGranted = data.initialPermissions?.some(
          (p) => p.screenId === screen.id && p.actionId === action.id,
        ) || (data.isSystem && slug === 'super_admin');

        permissionData.push({
          roleId: role.id,
          screenId: screen.id,
          actionId: action.id,
          granted: isGranted,
        });
      }
    }

    if (permissionData.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionData,
      });
    }

    return role;
  }

  async findDefaultRole(userType: any) {
    return this.prisma.role.findFirst({
      where: { isSystem: true, targetUserType: userType, orgId: null },
    });
  }

  async cloneSystemRoles(orgId: string) {
    const systemRoles = await this.prisma.role.findMany({
      where: { orgId: null, isDefault: true, slug: { not: 'super_admin' } },
      include: { permissions: true },
    });

    for (const sysRole of systemRoles) {
      const newRole = await this.prisma.role.create({
        data: {
          name: sysRole.name,
          slug: sysRole.slug,
          description: sysRole.description,
          orgId,
          isSystem: false, // Organization copy is not a system role
          isDefault: sysRole.isDefault,
        },
      });

      const permissions = sysRole.permissions.map((p) => ({
        roleId: newRole.id,
        featureId: p.featureId,
        screenId: p.screenId,
        actionId: p.actionId,
        granted: p.granted,
      }));

      if (permissions.length > 0) {
        await this.prisma.rolePermission.createMany({ data: permissions });
      }
    }
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
      include: {
        feature: { include: { module: true } },
        screen: { include: { module: true } },
        action: true,
      },
    });
  }

  async setRolePermissions(
    roleId: string,
    permissionIds: { featureId?: string; screenId?: string; actionId: string }[],
  ) {
    // First, set all to false
    await this.prisma.rolePermission.updateMany({
      where: { roleId },
      data: { granted: false },
    });

    // Then set specific ones to true
    for (const perm of permissionIds) {
      if (perm.screenId) {
        await this.prisma.rolePermission.updateMany({
          where: { roleId, screenId: perm.screenId, actionId: perm.actionId },
          data: { granted: true },
        });
      } else if (perm.featureId) {
        await this.prisma.rolePermission.updateMany({
          where: { roleId, featureId: perm.featureId, actionId: perm.actionId },
          data: { granted: true },
        });
      }
    }

    return { success: true };
  }

  async assignUserRole(data: { userId: string; roleId: string; orgId: string }) {
    return this.prisma.userRole.upsert({
      where: {
        userId_roleId_orgId: { userId: data.userId, roleId: data.roleId, orgId: data.orgId },
      },
      create: data,
      update: {},
    });
  }

  async getUserRoles(userId: string, orgId: string) {
    return this.prisma.userRole.findMany({
      where: { userId, orgId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                feature: true,
                screen: true,
                action: true,
              },
            },
          },
        },
      },
    });
  }

  async updateRole(id: string, data: { name?: string; description?: string; isSystem?: boolean; isDefault?: boolean; targetUserType?: any }) {
    return this.prisma.role.update({
      where: { id },
      data: {
        ...data,
        slug: data.name ? data.name.toLowerCase().replace(/\s+/g, '_') : undefined,
      },
    });
  }

  async deleteRole(id: string) {
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.userRole.deleteMany({ where: { roleId: id } });
    return this.prisma.role.delete({ where: { id } });
  }

  async findModules() {
    return this.prisma.module.findMany({
      include: { features: { include: { actions: true } } },
    });
  }

  async findScreens() {
    return this.prisma.screen.findMany({
      include: {
        actions: true,
        module: true,
      },
    });
  }
}
