import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: { professional: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ skip, take, where, orderBy, include: { professional: true } }),
      this.prisma.user.count({ where }),
    ]);
    return { users, total };
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  async countByOrg(orgId: string) {
    return this.prisma.organizationMember.count({ where: { orgId, status: 'active' } });
  }
}
