/**
 * System roles – immutable, seeded at startup
 */
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_OWNER: 'org_owner',
  ORG_ADMIN: 'org_admin',
  ORG_MEMBER: 'org_member',
  CLIENT: 'client',
  ADVOCATE: 'advocate',
  DETECTIVE: 'detective',
} as const;

/**
 * Organisation-scoped roles hierarchy
 */
export const ORG_ROLE_HIERARCHY = {
  [SYSTEM_ROLES.ORG_OWNER]: 100,
  [SYSTEM_ROLES.ORG_ADMIN]: 80,
  [SYSTEM_ROLES.ORG_MEMBER]: 50,
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];
