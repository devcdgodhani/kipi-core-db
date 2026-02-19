import { MODULE_KEYS } from './modules.constants';

/**
 * Feature Keys within each module
 */
export const FEATURE_KEYS = {
  // Cases
  CASES_CREATE: 'cases.create',
  CASES_READ: 'cases.read',
  CASES_UPDATE: 'cases.update',
  CASES_DELETE: 'cases.delete',
  CASES_ASSIGN: 'cases.assign',
  CASES_CLOSE: 'cases.close',
  CASES_EXPORT: 'cases.export',
  // Chat
  CHAT_SEND: 'chat.send',
  CHAT_READ: 'chat.read',
  CHAT_DELETE: 'chat.delete',
  // Documents
  DOCS_UPLOAD: 'documents.upload',
  DOCS_DOWNLOAD: 'documents.download',
  DOCS_DELETE: 'documents.delete',
  // Team
  TEAM_INVITE: 'team.invite',
  TEAM_REMOVE: 'team.remove',
  TEAM_VIEW: 'team.view',
  TEAM_MANAGE_ROLES: 'team.manage_roles',
  // Billing
  BILLING_VIEW: 'billing.view',
  BILLING_MANAGE: 'billing.manage',
  // Analytics
  ANALYTICS_VIEW: 'analytics.view',
  // Professionals
  PROFESSIONALS_VIEW: 'professionals.view',
  PROFESSIONALS_HIRE: 'professionals.hire',
  // Audit
  AUDIT_VIEW: 'audit.view',
} as const;

/**
 * Action Keys
 */
export const ACTION_KEYS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
  EXPORT: 'export',
  IMPORT: 'import',
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];
export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];
export type ActionKey = (typeof ACTION_KEYS)[keyof typeof ACTION_KEYS];
