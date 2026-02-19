import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { VerificationStatus } from '@prisma/client';

@Injectable()
export class ProfessionalsRepository {
  constructor(private prisma: PrismaService) {}

  async upsert(userId: string, data: any) {
    return this.prisma.professional.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.professional.findUnique({
      where: { userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
    });
  }

  async findById(id: string) {
    return this.prisma.professional.findUnique({
      where: { id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
    });
  }

  async findAll(params: { skip?: number; take?: number; type?: string; specialization?: string; city?: string }) {
    const where: any = { verificationStatus: 'verified', isAvailable: true };
    if (params.type) where.type = params.type;
    if (params.city) where.city = { contains: params.city, mode: 'insensitive' };
    if (params.specialization) where.specializations = { has: params.specialization };

    const [items, total] = await Promise.all([
      this.prisma.professional.findMany({
        where, skip: params.skip, take: params.take,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
        orderBy: { rating: 'desc' },
      }),
      this.prisma.professional.count({ where }),
    ]);
    return { items, total };
  }

  async updateStatus(id: string, verificationStatus: VerificationStatus) {
    return this.prisma.professional.update({ where: { id }, data: { verificationStatus } });
  }
}
