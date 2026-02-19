/**
 * Module Keys – used in SubscriptionPlan.modules and RolePermission.module
 */
export const MODULE_KEYS = {
  CASES: 'cases',
  BILLING: 'billing',
  TEAM: 'team',
  CHAT: 'chat',
  DOCUMENTS: 'documents',
  ANALYTICS: 'analytics',
  NOTIFICATIONS: 'notifications',
  AUDIT: 'audit',
  PROFESSIONALS: 'professionals',
  ADMIN: 'admin',
  ROLES: 'roles',
  SUBSCRIPTION: 'subscription',
  SECURITY: 'security',
  ORGANIZATIONS: 'organizations',
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];
