import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RolesPermissionsRepository {
  constructor(private prisma: PrismaService) {}

  async createRole(data: { name: string; description?: string; orgId: string; isSystem?: boolean }) {
    const slug = data.name.toLowerCase().replace(/\s+/g, '_');
    return this.prisma.role.create({ data: { ...data, slug } });
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

  async setRolePermissions(roleId: string, actionIds: string[]) {
    // Clear and reset
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    const actions = await this.prisma.action.findMany({ where: { id: { in: actionIds } } });
    const records = actions.map((a) => ({ roleId, featureId: a.featureId, actionId: a.id }));
    return this.prisma.rolePermission.createMany({ data: records });
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
