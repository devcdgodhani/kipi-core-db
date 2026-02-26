import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionPlansRepository } from '../repositories/subscription-plans.repository';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from '../dto/subscription-plan.dto';
import { AuditService } from '../../audit/services/audit.service';
import { AppType } from '@prisma/client';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    private repository: SubscriptionPlansRepository,
    private auditService: AuditService,
  ) {}

  async createPlan(dto: CreateSubscriptionPlanDto, userId: string) {
    const plan = await this.repository.create(dto);

    await this.auditService.log({
      userId,
      appType: AppType.ADMIN_WEB,
      module: 'subscription_plans',
      action: 'create_plan',
      entityType: 'subscription_plan',
      entityId: plan.id,
      newData: dto,
    });

    return plan;
  }

  async updatePlan(id: string, dto: UpdateSubscriptionPlanDto, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Subscription plan not found');

    const updated = await this.repository.update(id, dto);

    await this.auditService.log({
      userId,
      appType: AppType.ADMIN_WEB,
      module: 'subscription_plans',
      action: 'update_plan',
      entityType: 'subscription_plan',
      entityId: id,
      oldData: existing,
      newData: dto,
    });

    return updated;
  }

  async getPublicPlans() {
    return this.repository.findAll(true);
  }

  async getAllPlans() {
    return this.repository.findAll(false);
  }

  async getPlanById(id: string) {
    const plan = await this.repository.findById(id);
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return plan;
  }

  async deletePlan(id: string, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Subscription plan not found');

    const result = await this.repository.delete(id);

    await this.auditService.log({
      userId,
      appType: AppType.ADMIN_WEB,
      module: 'subscription_plans',
      action: 'delete_plan',
      entityType: 'subscription_plan',
      entityId: id,
    });

    return result;
  }
}
