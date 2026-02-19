import { SetMetadata } from '@nestjs/common';
import { SystemRole } from '../constants/roles.constants';

export const ROLES_KEY = 'roles';

/**
 * Declare the required system roles for a route.
 * Usage: @Roles(SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ORG_OWNER)
 */
export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles);
