import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ApprovalStatus } from '@prisma/client';

@Injectable()
export class ProfessionalsRepository {
  constructor(private prisma: PrismaService) {}

  async upsert(userId: string, data: any) {
    return this.prisma.professional.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, approvalStatus: true } },
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.professional.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, approvalStatus: true } },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.professional.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, approvalStatus: true } },
      },
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    specialization?: string;
    city?: string;
  }) {
    const where: any = {
      user: {
        approvalStatus: 'approved',
        isActive: true,
        deletedAt: null
      }
    };
    if (params.city) where.location = { contains: params.city, mode: 'insensitive' };
    if (params.specialization) where.specializations = { has: params.specialization };

    const [items, total] = await Promise.all([
      this.prisma.professional.findMany({
        where,
        skip: params.skip,
        take: params.take,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.professional.count({ where }),
    ]);
    return { items, total };
  }

  async updateApprovalStatus(userId: string, status: ApprovalStatus) {
    return this.prisma.user.update({ where: { id: userId }, data: { approvalStatus: status } });
  }
}
