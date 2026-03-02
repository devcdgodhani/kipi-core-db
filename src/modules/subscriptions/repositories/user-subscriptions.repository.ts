import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class UserSubscriptionsRepository {
  constructor(private prisma: PrismaService) { }

  async findByUser(userId: string) {
    return this.prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: {
          include: {
            limits: true,
            modules: {
              include: {
                module: true,
              },
            },
            planFeatures: {
              include: {
                feature: true,
              },
            },
          },
        },
      },
    });
  }

  async upsert(userId: string, data: any) {
    return this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, ...data },
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
            planFeatures: {
              include: {
                feature: true,
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
