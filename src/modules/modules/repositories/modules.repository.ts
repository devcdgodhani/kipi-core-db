import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UserType, AppType } from '@prisma/client';

@Injectable()
export class ModulesRepository {
  constructor(private prisma: PrismaService) { }

  async findModulesByTarget(userType: UserType, appType: AppType = 'MAIN_WEB') {
    return this.prisma.module.findMany({
      where: {
        appType,
        targetUserTypes: { has: userType },
        isActive: true,
      },
      include: {
        features: {
          where: {
            targetUserTypes: { has: userType },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAllModules(userType?: UserType) {
    const where: any = { isActive: true };
    if (userType) {
      where.targetUserTypes = { has: userType };
    }

    return this.prisma.module.findMany({
      where,
      include: {
        features: {
          where: userType ? { targetUserTypes: { has: userType } } : undefined,
          include: {
            actions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }


  async findUserActivePlanFeatures(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
      },
      include: {
        plan: {
          include: {
            planFeatures: {
              include: {
                feature: true,
              },
            },
            modules: {
              include: {
                module: true,
              },
            },
          },
        },
      },
    });

    if (!subscription) return null;

    return {
      moduleIds: subscription.plan.modules.map(m => m.moduleId),
      moduleKeys: subscription.plan.modules.map(m => m.module.key),
      featureIds: subscription.plan.planFeatures.map(f => f.featureId),
      featureKeys: subscription.plan.planFeatures.map(f => f.feature.key),
    };
  }
}
