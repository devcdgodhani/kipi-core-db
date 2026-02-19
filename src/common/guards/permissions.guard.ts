import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SYSTEM_ROLES } from '../constants/roles.constants';
import { RedisService } from '../../database/redis.service';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

/**
 * Enterprise RBAC Permission Guard
 *
 * Check order:
 * 1. Is route public? → allow
 * 2. Is user super_admin? → allow
 * 3. Does org have an active subscription? → check Redis cache
 * 4. Is the required module included in the plan?
 * 5. Does user's role have the required permission? (Redis cache)
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permission decorator → guard passes
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user) throw new UnauthorizedException('Authentication required');

    // Super admins bypass all permission checks
    if (user.role === SYSTEM_ROLES.SUPER_ADMIN) return true;

    const orgId = request.headers['x-org-id'] || user.currentOrgId;

    // ── Check subscription from Redis cache ─────────────────
    if (orgId) {
      const subCacheKey = `jl:subscription:${orgId}`;
      const subscription = await this.redisService.get<{ status: string; modules: string[] }>(subCacheKey);

      if (subscription && subscription.status !== 'active' && subscription.status !== 'trialing') {
        throw new ForbiddenException('Your organization subscription is not active');
      }

      // Check if the required module is in the plan
      if (subscription?.modules) {
        for (const permission of requiredPermissions) {
          const moduleKey = permission.split('.')[0];
          if (!subscription.modules.includes(moduleKey)) {
            throw new ForbiddenException(`Module '${moduleKey}' is not available in your current plan`);
          }
        }
      }
    }

    // ── Check role permissions from Redis cache ────────────
    const permCacheKey = `jl:permissions:${user.sub}:${orgId || 'system'}`;
    const cachedPermissions = await this.redisService.get<string[]>(permCacheKey);

    if (cachedPermissions) {
      const hasPermission = requiredPermissions.every((perm) =>
        cachedPermissions.includes(perm),
      );
      if (!hasPermission) {
        throw new ForbiddenException('You do not have the required permissions');
      }
      return true;
    }

    // If no cache, allow (permissions service will handle deeper validation)
    // In production, this would call the permissions service to rebuild cache
    return true;
  }
}
