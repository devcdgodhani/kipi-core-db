import { SetMetadata } from '@nestjs/common';

export const PLAN_ACCESS_KEY = 'plan_access';

export interface PlanAccessOptions {
  moduleKey?: string;
  featureKey?: string;
}

export const RequiresPlanAccess = (options: PlanAccessOptions) =>
  SetMetadata(PLAN_ACCESS_KEY, options);
