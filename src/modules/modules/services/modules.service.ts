import { Injectable } from '@nestjs/common';
import { ModulesRepository } from '../repositories/modules.repository';
import { UserType } from '@prisma/client';

@Injectable()
export class ModulesService {
  constructor(private repository: ModulesRepository) { }

  async getUserModules(userId: string, userType: UserType) {
    const allModules = await this.repository.findModulesByTarget(userType);
    const planAccess = await this.repository.findUserActivePlanFeatures(userId);

    return allModules.map(module => ({
      ...module,
      isInPlan: planAccess?.moduleIds.includes(module.id) ?? false,
      features: module.features.map(feature => ({
        ...feature,
        isInPlan: planAccess?.featureIds.includes(feature.id) ?? false,
      })),
    }));
  }

  async getAllModules(userType?: UserType) {
    return this.repository.findAllModules(userType);
  }
}

