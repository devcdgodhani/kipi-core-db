import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class OrgSubscriptionsRepository {
  constructor(private prisma: PrismaService) {}

  async findByOrg(orgId: string) {
    return this.prisma.subscription.findUnique({
      where: { orgId },
      include: {
        plan: {
          include: {
            limits: true,
            modules: {
              include: {
                module: true,
              },
            },
          },
        },
      },
    });
  }

  async upsert(orgId: string, data: any) {
    return this.prisma.subscription.upsert({
      where: { orgId },
      create: { orgId, ...data },
      update: data,
      include: {
        plan: {
          include: {
            limits: true,
            modules: {
              include: {
                module: true,
              },
            },
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: SubscriptionStatus, cancelReason?: string) {
    return this.prisma.subscription.update({
      where: { id },
      data: {
        status,
        canceledAt: status === 'canceled' ? new Date() : undefined,
        cancelReason: cancelReason || undefined,
      },
      include: { plan: true },
    });
  }
}
