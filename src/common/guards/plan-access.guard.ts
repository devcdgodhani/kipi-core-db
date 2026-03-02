import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLAN_ACCESS_KEY, PlanAccessOptions } from '../decorators/plan-access.decorator';
import { ModulesRepository } from '../../modules/modules/repositories/modules.repository';

@Injectable()
export class PlanAccessGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private modulesRepository: ModulesRepository,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const options = this.reflector.getAllAndOverride<PlanAccessOptions>(
            PLAN_ACCESS_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!options) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('User session not found');
        }

        // Super admin bypass
        if (user.userType === 'super_admin' || user.isSuperAdmin) {
            return true;
        }

        const { moduleKey, featureKey } = options;
        const planAccess = await this.modulesRepository.findUserActivePlanFeatures(user.id);

        // If no access object returned, check if it's because of no active subscription
        if (!planAccess) {
            throw new ForbiddenException('No active subscription found or plan does not cover this module');
        }

        if (moduleKey) {
            const hasModule = planAccess.moduleKeys.includes(moduleKey);
            if (!hasModule) {
                throw new ForbiddenException(`Your current plan does not include the ${moduleKey} module`);
            }
        }

        if (featureKey) {
            const hasFeature = planAccess.featureKeys.includes(featureKey);
            if (!hasFeature) {
                throw new ForbiddenException(`Your current plan does not include the ${featureKey} feature`);
            }
        }

        return true;
    }
}
