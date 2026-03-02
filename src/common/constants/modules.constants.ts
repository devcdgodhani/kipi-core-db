/**
 * Module Keys – used in SubscriptionPlan.modules and RolePermission.module
 * Prefixed by app type for uniqueness
 */
export const MODULE_KEYS = {
  // Admin App
  ADMIN_DASHBOARD: 'admin.dashboard',
  ADMIN_USERS: 'admin.user-management',
  ADMIN_ROLES: 'admin.roles',
  ADMIN_SUBSCRIPTIONS: 'admin.subscriptions',
  ADMIN_SETTINGS: 'admin.settings',

  // Main App
  MAIN_DASHBOARD: 'main.dashboard',
  PROFESSIONAL_DASHBOARD: 'professional.dashboard',
  LAWFIRM_DASHBOARD: 'lawfirm.dashboard',
  CASES: 'main.cases',
  CHAT: 'main.chat',
  PROFESSIONALS: 'main.professionals',
  TEAM: 'main.team',
  ORGANIZATION: 'main.organization',
  SETTINGS: 'main.settings',
  STORAGE: 'main.storage',
  NOTIFICATIONS: 'main.notifications',

  // Compatibility / Audit log keys
  USERS: 'users', 
  ADMIN: 'admin',
  ROLES: 'roles',
  SUBSCRIPTION: 'subscriptions',
  ORGANIZATIONS: 'organizations',
  BILLING: 'billing',
  SECURITY: 'security',
  STORAGE_COMPAT: 'storage',
  NOTIFICATIONS_COMPAT: 'notifications',
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];
