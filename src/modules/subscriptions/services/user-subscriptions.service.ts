import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserSubscriptionsRepository } from '../repositories/user-subscriptions.repository';
import { SubscriptionPlansService } from './subscription-plans.service';
import { RedisService } from '../../../database/redis.service';
import { AuditService } from '../../audit/services/audit.service';
import { AppType, SubscriptionStatus } from '@prisma/client';
import dayjs from 'dayjs';

@Injectable()
export class UserSubscriptionsService {
  constructor(
    private repository: UserSubscriptionsRepository,
    private planService: SubscriptionPlansService,
    private redisService: RedisService,
    private auditService: AuditService,
  ) {}

  async getUserSubscription(userId: string) {
    const sub = await this.repository.findByUser(userId);
    if (!sub) throw new NotFoundException('User has no active subscription');
    return sub;
  }

  async subscribe(userId: string, planId: string, billingInterval: 'monthly' | 'yearly') {
    const plan = await this.planService.getPlanById(planId);
    if (!plan.isActive) throw new BadRequestException('Selected plan is not active');

    const now = dayjs();
    const periodEnd = billingInterval === 'yearly'
      ? now.add(1, 'year')
      : now.add(1, 'month');

    const trialEndsAt = plan.trialDays > 0 ? now.add(plan.trialDays, 'day').toDate() : null;

    const sub = await this.repository.upsert(userId, {
      planId,
      status: plan.trialDays > 0 ? SubscriptionStatus.trialing : SubscriptionStatus.active,
      billingInterval,
      currentPeriodStart: now.toDate(),
      currentPeriodEnd: periodEnd.toDate(),
      trialEndsAt,
    });

    await this.cacheSubscriptionState(userId, sub);

    await this.auditService.log({
      userId,
      appType: AppType.MAIN_WEB,
      module: 'subscriptions',
      action: 'subscribe',
      entityType: 'subscription',
      entityId: sub.id,
      newData: { planId, status: sub.status, billingInterval },
    });

    return sub;
  }

  async cancelSubscription(userId: string, reason: string) {
    const sub = await this.getUserSubscription(userId);
    
    const updated = await this.repository.updateStatus(sub.id, SubscriptionStatus.canceled, reason);
    
    await this.redisService.del(`jl:subscription:${userId}`);

    await this.auditService.log({
      userId,
      appType: AppType.MAIN_WEB,
      module: 'subscriptions',
      action: 'cancel',
      entityType: 'subscription',
      entityId: sub.id,
      newData: { reason },
    });

    return updated;
  }

  private async cacheSubscriptionState(userId: string, sub: any) {
    const modules = sub.plan?.modules?.map((pm: any) => pm.module?.key) || [];
    const limits = sub.plan?.limits?.reduce((acc: any, limit: any) => {
      acc[limit.key] = limit.value;
      return acc;
    }, {}) || {};

    await this.redisService.set(
      `jl:subscription:${userId}`,
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
