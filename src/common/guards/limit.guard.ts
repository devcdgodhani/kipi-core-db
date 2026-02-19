import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { RedisService } from '../../database/redis.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LimitGuard implements CanActivate {
    constructor(
        private redisService: RedisService,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const orgId = request.headers['x-org-id'] || user?.currentOrgId;

        if (!orgId) return true;

        // This is a generic guard handler. Specific limit checks should be triggered
        // based on the route being accessed. For now, we'll implement a stub
        // that can be extended with specific logic meta.

        return true;
    }

    async checkLimit(orgId: string, key: string, currentCount: number): Promise<boolean> {
        const cacheKey = `jl:limits:${orgId}`;
        const limits = await this.redisService.get<Record<string, number>>(cacheKey);

        if (!limits || limits[key] === undefined) return true;

        const limit = limits[key];
        if (limit === -1) return true; // unlimited

        if (currentCount >= limit) {
            throw new ForbiddenException(`Plan limit exceeded for ${key}. Current: ${currentCount}, Limit: ${limit}`);
        }

        return true;
    }
}
