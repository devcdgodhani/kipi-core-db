import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { RedisService } from '../../../database/redis.service';
import { AuditService } from '../../audit/services/audit.service';
import { BillingInterval } from '@prisma/client';
import dayjs from 'dayjs';

interface CreatePlanDto {
  name: string; slug: string; description?: string; price: number;
  billingInterval?: BillingInterval; trialDays?: number;
}

@Injectable()
export class SubscriptionService {
  constructor(
    private repo: SubscriptionRepository,
    private redisService: RedisService,
    private auditService: AuditService,
  ) {}

  async getPlans() {
    return this.repo.findAllPlans(true);
  }

  async getPlanById(id: string) {
    const plan = await this.repo.findPlanById(id);
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async createPlan(dto: CreatePlanDto, adminUserId: string) {
    const plan = await this.repo.createPlan({ ...dto, billingInterval: dto.billingInterval || 'monthly', trialDays: dto.trialDays || 0 });
    await this.auditService.log({ userId: adminUserId, module: 'subscription', action: 'create_plan', entityType: 'plan', entityId: plan.id });
    return plan;
  }

  async updatePlan(id: string, data: Partial<CreatePlanDto>, adminUserId: string) {
    const plan = await this.repo.updatePlan(id, data);
    await this.auditService.log({ userId: adminUserId, module: 'subscription', action: 'update_plan', entityType: 'plan', entityId: id, newData: data });
    return plan;
  }

  async getOrgSubscription(orgId: string) {
    const sub = await this.repo.findByOrg(orgId);
    if (!sub) throw new NotFoundException('No active subscription found');
    return sub;
  }

  async subscribe(orgId: string, planId: string, userId: string) {
    const plan = await this.getPlanById(planId);
    const now = dayjs();
    const periodEnd = plan.billingInterval === 'yearly'
      ? now.add(1, 'year') : plan.billingInterval === 'quarterly'
      ? now.add(3, 'month') : now.add(1, 'month');

    const trialEndsAt = plan.trialDays > 0 ? now.add(plan.trialDays, 'day').toDate() : null;
    const sub = await this.repo.upsertSubscription(orgId, planId, {
      status: plan.trialDays > 0 ? 'trialing' : 'active',
      currentPeriodStart: now.toDate(),
      currentPeriodEnd: periodEnd.toDate(),
      trialEndsAt,
    });
    await this.cacheSubscription(orgId, sub);
    await this.auditService.log({ userId, orgId, module: 'subscription', action: 'subscribe', entityType: 'subscription', entityId: sub.id, newData: { planId } });
    return sub;
  }

  async cancelSubscription(orgId: string, reason: string, userId: string) {
    const sub = await this.repo.findByOrg(orgId);
    if (!sub) throw new NotFoundException('No subscription found');
    await this.repo.updateStatus(orgId, 'canceled');
    await this.redisService.del(`jl:subscription:${orgId}`);
    await this.auditService.log({ userId, orgId, module: 'subscription', action: 'cancel', entityType: 'subscription', entityId: sub.id, newData: { reason } });
    return { message: 'Subscription cancelled' };
  }

  private async cacheSubscription(orgId: string, sub: any) {
    const modules = sub.plan?.modules?.map((pm: any) => pm.module?.key) || [];
    await this.redisService.set(`jl:subscription:${orgId}`, {
      status: sub.status, planSlug: sub.plan?.slug, modules, limits: sub.plan?.limits || [], expiresAt: sub.currentPeriodEnd,
    }, 3600);
  }
}
