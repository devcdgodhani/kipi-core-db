import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from '../dto/subscription-plans.dto';
import { UserType } from '@prisma/client';

@Injectable()
export class SubscriptionPlansRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateSubscriptionPlanDto) {
    const { limits, moduleIds, featureIds, ...planData } = data;

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
        planFeatures: {
          create: featureIds?.map((featureId) => ({
            featureId,
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
        planFeatures: {
          include: {
            feature: true,
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateSubscriptionPlanDto) {
    const { limits, moduleIds, featureIds, ...planData } = data;

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

      // Update features
      if (featureIds) {
        await tx.planFeature.deleteMany({ where: { planId: id } });
        await tx.planFeature.createMany({
          data: featureIds.map((featureId) => ({ planId: id, featureId })),
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
          planFeatures: {
            include: {
              feature: true,
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
        planFeatures: {
          include: {
            feature: true,
          },
        },
      },
    });
  }

  async findAll(onlyPublic = false, userType?: UserType) {
    const where: any = {};
    if (onlyPublic) {
      where.isPublic = true;
      where.isActive = true;
    }
    if (userType) {
      where.targetUserType = userType;
    }

    return this.prisma.subscriptionPlan.findMany({
      where,
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
      orderBy: { monthlyPrice: 'asc' },
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
