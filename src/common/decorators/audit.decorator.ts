import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditMetadata {
  action: string;
  module: string;
}

/**
 * Decorator to mark a method for auditing.
 * Usage: @Audit({ action: 'create', module: 'cases' })
 */
export const Audit = (metadata: AuditMetadata) => SetMetadata(AUDIT_KEY, metadata);
