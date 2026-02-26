import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrgSubscriptionsRepository } from '../repositories/org-subscriptions.repository';
import { SubscriptionPlansService } from './subscription-plans.service';
import { RedisService } from '../../../database/redis.service';
import { AuditService } from '../../audit/services/audit.service';
import { AppType, SubscriptionStatus } from '@prisma/client';
import dayjs from 'dayjs';

@Injectable()
export class OrgSubscriptionsService {
  constructor(
    private repository: OrgSubscriptionsRepository,
    private planService: SubscriptionPlansService,
    private redisService: RedisService,
    private auditService: AuditService,
  ) {}

  async getOrgSubscription(orgId: string) {
    const sub = await this.repository.findByOrg(orgId);
    if (!sub) throw new NotFoundException('Organization has no active subscription');
    return sub;
  }

  async subscribe(orgId: string, planId: string, userId: string) {
    const plan = await this.planService.getPlanById(planId);
    if (!plan.isActive) throw new BadRequestException('Selected plan is not active');

    const now = dayjs();
    const periodEnd = plan.billingInterval === 'yearly'
      ? now.add(1, 'year')
      : plan.billingInterval === 'quarterly'
        ? now.add(3, 'month')
        : now.add(1, 'month');

    const trialEndsAt = plan.trialDays > 0 ? now.add(plan.trialDays, 'day').toDate() : null;

    const sub = await this.repository.upsert(orgId, {
      planId,
      status: plan.trialDays > 0 ? SubscriptionStatus.trialing : SubscriptionStatus.active,
      currentPeriodStart: now.toDate(),
      currentPeriodEnd: periodEnd.toDate(),
      trialEndsAt,
    });

    await this.cacheSubscriptionState(orgId, sub);

    await this.auditService.log({
      userId,
      orgId,
      appType: AppType.MAIN_WEB,
      module: 'subscriptions',
      action: 'subscribe',
      entityType: 'subscription',
      entityId: sub.id,
      newData: { planId, status: sub.status },
    });

    return sub;
  }

  async cancelSubscription(orgId: string, reason: string, userId: string) {
    const sub = await this.getOrgSubscription(orgId);
    
    const updated = await this.repository.updateStatus(sub.id, SubscriptionStatus.canceled, reason);
    
    await this.redisService.del(`jl:subscription:${orgId}`);

    await this.auditService.log({
      userId,
      orgId,
      appType: AppType.MAIN_WEB,
      module: 'subscriptions',
      action: 'cancel',
      entityType: 'subscription',
      entityId: sub.id,
      newData: { reason },
    });

    return updated;
  }

  private async cacheSubscriptionState(orgId: string, sub: any) {
    const modules = sub.plan?.modules?.map((pm: any) => pm.module?.key) || [];
    const limits = sub.plan?.limits?.reduce((acc: any, limit: any) => {
      acc[limit.key] = limit.value;
      return acc;
    }, {}) || {};

    await this.redisService.set(
      `jl:subscription:${orgId}`,
      {
        status: sub.status,
        planSlug: sub.plan?.slug,
        modules,
        limits,
        expiresAt: sub.currentPeriodEnd,
      },
      3600 * 24, // 24 hours
    );
  }
}
