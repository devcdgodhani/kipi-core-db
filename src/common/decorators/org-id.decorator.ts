import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the X-Org-Id header from the request
 * Usage: @OrgId() orgId: string
 */
export const OrgId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return request.headers['x-org-id'] || request.user?.currentOrgId;
});

export const GetOrg = OrgId;
