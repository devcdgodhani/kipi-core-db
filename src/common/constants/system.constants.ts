/**
 * System-wide constants for JusticeLynk
 */
export const SYSTEM_CONSTANTS = {
  API_PREFIX: 'api',
  // API_PREFIX: 'api/v1',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  BCRYPT_ROUNDS: 12,
  MFA_TOKEN_WINDOW: 1,
  REFRESH_TOKEN_BYTES: 64,
  BACKUP_CODE_COUNT: 10,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCK_DURATION_MINUTES: 30,
  CACHE_PREFIX: 'jl',
} as const;

export const USER_TYPES = {
  CLIENT: 'client',
  ADVOCATE: 'advocate',
  DETECTIVE: 'detective',
  SUPER_ADMIN: 'super_admin',
} as const;

export const PROFESSIONAL_TYPES = {
  ADVOCATE: 'advocate',
  DETECTIVE: 'detective',
} as const;

export const ORG_TYPES = {
  LAW_FIRM: 'law_firm',
  DETECTIVE_AGENCY: 'detective_agency',
  SOLO_PRACTICE: 'solo_practice',
} as const;

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export const CASE_STATUSES = {
  OPEN: 'open',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  HEARING: 'hearing',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
} as const;

export const CASE_TYPES = {
  LEGAL: 'legal',
  INVESTIGATION: 'investigation',
  ARBITRATION: 'arbitration',
  CONSULTATION: 'consultation',
} as const;

export const ORG_MEMBER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  INVITED: 'invited',
  SUSPENDED: 'suspended',
} as const;

export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];
export type ProfessionalType = (typeof PROFESSIONAL_TYPES)[keyof typeof PROFESSIONAL_TYPES];
export type OrgType = (typeof ORG_TYPES)[keyof typeof ORG_TYPES];
export type CaseStatus = (typeof CASE_STATUSES)[keyof typeof CASE_STATUSES];
export type CaseType = (typeof CASE_TYPES)[keyof typeof CASE_TYPES];
