import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SubscriptionRepository {
  constructor(private prisma: PrismaService) {}

  async findAllPlans(onlyActive = true) {
    return this.prisma.subscriptionPlan.findMany({
      where: onlyActive ? { isActive: true, isPublic: true } : undefined,
      orderBy: { price: 'asc' },
    });
  }

  async findPlanById(id: string) {
    return this.prisma.subscriptionPlan.findUnique({ where: { id } });
  }

  async findPlanBySlug(slug: string) {
    return this.prisma.subscriptionPlan.findUnique({ where: { slug } });
  }

  async createPlan(data: any) {
    return this.prisma.subscriptionPlan.create({ data });
  }

  async updatePlan(id: string, data: any) {
    return this.prisma.subscriptionPlan.update({ where: { id }, data });
  }

  async findByOrg(orgId: string) {
    return this.prisma.subscription.findUnique({
      where: { orgId },
      include: { plan: true },
    });
  }

  async upsertSubscription(orgId: string, planId: string, data: any) {
    return this.prisma.subscription.upsert({
      where: { orgId },
      create: { orgId, planId, ...data },
      update: { planId, ...data },
      include: { plan: true },
    });
  }

  async updateStatus(orgId: string, status: string) {
    return this.prisma.subscription.update({
      where: { orgId },
      data: { status: status as any, canceledAt: status === 'canceled' ? new Date() : null },
    });
  }
}
