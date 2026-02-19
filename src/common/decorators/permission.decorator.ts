import { SetMetadata } from '@nestjs/common';
import { FeatureKey } from '../constants/permissions.constants';

export const PERMISSION_KEY = 'permission';

/**
 * Declare the required permission for a route.
 * Usage: @Permission('cases.create')
 */
export const Permission = (...permissions: FeatureKey[]) =>
  SetMetadata(PERMISSION_KEY, permissions);
