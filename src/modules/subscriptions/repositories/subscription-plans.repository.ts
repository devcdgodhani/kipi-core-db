import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from '../dto/subscription-plan.dto';

@Injectable()
export class SubscriptionPlansRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateSubscriptionPlanDto) {
    const { limits, moduleIds, ...planData } = data;
    const slug = data.name.toLowerCase().replace(/\s+/g, '-');

    return this.prisma.subscriptionPlan.create({
      data: {
        ...planData,
        slug,
        limits: {
          create: limits?.map((limit) => ({
            key: limit.key,
            value: limit.value,
          })),
        },
        modules: {
          create: moduleIds?.map((moduleId) => ({
            moduleId,
          })),
        },
      },
      include: {
        limits: true,
        modules: {
          include: {
            module: true,
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateSubscriptionPlanDto) {
    const { limits, moduleIds, ...planData } = data;

    const updatePayload: any = { ...planData };
    if (data.name) {
      updatePayload.slug = data.name.toLowerCase().replace(/\s+/g, '-');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update basic data
      await tx.subscriptionPlan.update({
        where: { id },
        data: updatePayload,
      });

      // Update limits
      if (limits) {
        await tx.planLimit.deleteMany({ where: { planId: id } });
        await tx.planLimit.createMany({
          data: limits.map((l) => ({ ...l, planId: id })),
        });
      }

      // Update modules
      if (moduleIds) {
        await tx.planModule.deleteMany({ where: { planId: id } });
        await tx.planModule.createMany({
          data: moduleIds.map((moduleId) => ({ planId: id, moduleId })),
        });
      }

      return tx.subscriptionPlan.findUnique({
        where: { id },
        include: {
          limits: true,
          modules: {
            include: {
              module: true,
            },
          },
        },
      });
    });
  }

  async findById(id: string) {
    return this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        limits: true,
        modules: {
          include: {
            module: true,
          },
        },
      },
    });
  }

  async findAll(onlyPublic = false) {
    return this.prisma.subscriptionPlan.findMany({
      where: onlyPublic ? { isPublic: true, isActive: true } : {},
      include: {
        limits: true,
        modules: {
          include: {
            module: true,
          },
        },
      },
      orderBy: { price: 'asc' },
    });
  }

  async delete(id: string) {
    const activeSubsCount = await this.prisma.subscription.count({
      where: { planId: id, status: { not: 'canceled' } },
    });

    if (activeSubsCount > 0) {
      return this.prisma.subscriptionPlan.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.subscriptionPlan.delete({
      where: { id },
    });
  }
}
