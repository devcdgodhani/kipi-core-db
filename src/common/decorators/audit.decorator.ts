import { SetMetadata } from '@nestjs/common';
import { ActionKey, ModuleKey } from '../constants/permissions.constants';

export const AUDIT_KEY = 'audit';

export interface AuditMetadata {
  action: ActionKey;
  module: ModuleKey;
}

/**
 * Decorator to mark a method for auditing.
 * Usage: @Audit({ action: 'create', module: 'cases' })
 */
export const Audit = (metadata: AuditMetadata) => SetMetadata(AUDIT_KEY, metadata);
