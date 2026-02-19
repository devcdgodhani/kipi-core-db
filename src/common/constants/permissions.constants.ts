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
  // Organizations
  ORG_VIEW: 'organizations.view',
  ORG_MANAGE: 'organizations.manage',
  // Team
  TEAM_INVITE: 'team.invite',
  TEAM_REMOVE: 'team.remove',
  TEAM_VIEW: 'team.view',
  TEAM_UPDATE: 'team.update',
  TEAM_DELETE: 'team.delete',
  TEAM_MANAGE_ROLES: 'team.manage_roles',
  // Roles & Permissions
  ROLES_VIEW: 'roles.view',
  ROLES_MANAGE: 'roles.manage',
  // Subscription
  SUB_VIEW: 'subscription.view',
  SUB_MANAGE: 'subscription.manage',
  // Billing
  BILLING_VIEW: 'billing.view',
  BILLING_MANAGE: 'billing.manage',
  // Analytics
  ANALYTICS_VIEW: 'analytics.view',
  // Professionals
  PROFESSIONALS_VIEW: 'professionals.view',
  PROFESSIONALS_MANAGE: 'professionals.manage',
  PROFESSIONALS_HIRE: 'professionals.hire',
  // Audit
  AUDIT_VIEW: 'audit.view',
  // Notifications
  NOTIFICATIONS_VIEW: 'notifications.view',
  NOTIFICATIONS_MANAGE: 'notifications.manage',
  // Admin
  ADMIN_VIEW: 'admin.view',
  ADMIN_MANAGE: 'admin.manage',
  // Security
  SECURITY_MANAGE: 'security.manage',
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
  ASSIGN: 'assign',
  CLOSE: 'close',
  SEND: 'send',
  UPLOAD: 'upload',
  DOWNLOAD: 'download',
  INVITE: 'invite',
  HIRE: 'hire',
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];
export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];
export type ActionKey = (typeof ACTION_KEYS)[keyof typeof ACTION_KEYS];
