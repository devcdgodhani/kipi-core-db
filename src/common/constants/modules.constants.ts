/**
 * Module Keys – used in SubscriptionPlan.modules and RolePermission.module
 * Prefixed by app type for uniqueness
 */
export const MODULE_KEYS = {
  // ─── ADMIN WEB MODULES ──────────────────────────────
  ADMIN_DASHBOARD: 'admin.dashboard',
  ADMIN_USERS: 'admin.user-management',
  ADMIN_ORGANIZATIONS: 'admin.organizations',
  ADMIN_PROFESSIONALS: 'admin.professionals',
  ADMIN_ROLES: 'admin.roles',
  ADMIN_SUBSCRIPTIONS: 'admin.subscriptions',
  ADMIN_BILLING: 'admin.billing',
  ADMIN_AUDIT: 'admin.audit',
  ADMIN_SETTINGS: 'admin.settings',
  ADMIN_NOTIFICATIONS: 'admin.notifications',

  // ─── MAIN WEB MODULES ───────────────────────────────
  MAIN_DASHBOARD: 'main.dashboard',
  PROFESSIONAL_DASHBOARD: 'professional.dashboard',
  LAWFIRM_DASHBOARD: 'lawfirm.dashboard',
  CASES: 'main.cases',
  CHAT: 'main.chat',
  PROFESSIONALS: 'main.professionals', // The marketplace
  ORGANIZATION: 'main.organization', // Law firm team management
  BILLING: 'main.billing',
  NOTIFICATIONS: 'main.notifications',
  SETTINGS: 'main.settings',
  STORAGE: 'main.storage',

  // ─── COMPATIBILITY / SYSTEM ALIASES ─────────────────
  USERS: 'users', 
  ADMIN: 'admin',
  ROLES: 'roles',
  SUBSCRIPTION: 'subscriptions',
  ORGANIZATIONS: 'organizations',
  SECURITY: 'security',
  STORAGE_COMPAT: 'storage',
  NOTIFICATIONS_COMPAT: 'notifications',
  TEAM: 'team',
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];
