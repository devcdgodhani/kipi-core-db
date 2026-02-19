import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrganizationsRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.organization.create({ data });
  }

  async findById(id: string) {
    return this.prisma.organization.findUnique({
      where: { id, deletedAt: null },
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { members: true, cases: true } },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.organization.findUnique({ where: { slug, deletedAt: null } });
  }

  async findByUser(userId: string) {
    return this.prisma.organizationMember.findMany({
      where: { userId, status: 'active' },
      include: { organization: { include: { subscription: { include: { plan: true } }, _count: { select: { members: true } } } } },
    });
  }

  async update(id: string, data: Prisma.OrganizationUpdateInput) {
    return this.prisma.organization.update({ where: { id }, data });
  }

  async addMember(orgId: string, userId: string, role: any) {
    return this.prisma.organizationMember.upsert({
      where: { orgId_userId: { orgId, userId } },
      create: { orgId, userId, role: role as any, status: 'active' },
      update: { role: role as any, status: 'active' },
    });
  }

  async getMembers(orgId: string, skip: number, take: number) {
    const [items, total] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where: { orgId, status: 'active' },
        skip, take,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
        orderBy: { joinedAt: 'asc' },
      }),
      this.prisma.organizationMember.count({ where: { orgId, status: 'active' } }),
    ]);
    return { items, total };
  }

  async removeMember(orgId: string, userId: string) {
    return this.prisma.organizationMember.updateMany({ where: { orgId, userId }, data: { status: 'inactive' } });
  }

  async createInvite(data: any) {
    return this.prisma.organizationInvite.create({ data });
  }

  async findInviteByToken(token: string) {
    return this.prisma.organizationInvite.findUnique({ where: { token } });
  }

  async updateInviteStatus(id: string, accepted: boolean) {
    return this.prisma.organizationInvite.update({ where: { id }, data: { acceptedAt: accepted ? new Date() : null } });
  }
}
