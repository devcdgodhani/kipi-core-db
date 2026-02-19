import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../database/redis.service';
import { MODULE_KEYS } from '../constants/modules.constants';
import { SUBSCRIPTION_STATUSES } from '../constants/subscription.constants';

@Injectable()
export class SubscriptionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private redisService: RedisService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const orgId = request.headers['x-org-id'] || user?.currentOrgId;

        if (!orgId) {
            return true; // If no org context, skip (might be system action)
        }

        const cacheKey = `jl:subscription:${orgId}`;
        const subscription = await this.redisService.get<{ status: string; modules: string[] }>(cacheKey);

        if (!subscription) {
            // In production, fetch from DB and cache if not found in Redis
            return true;
        }

        if (
            subscription.status !== SUBSCRIPTION_STATUSES.ACTIVE &&
            subscription.status !== SUBSCRIPTION_STATUSES.TRIALING
        ) {
            throw new ForbiddenException('Your subscription is not active');
        }

        return true;
    }
}
