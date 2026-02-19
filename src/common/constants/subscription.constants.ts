/**
 * Subscription plan identifiers and default configurations
 */
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  SOLO_ADVOCATE: 'solo_advocate',
  SOLO_DETECTIVE: 'solo_detective',
  LAW_FIRM_STARTER: 'law_firm_starter',
  LAW_FIRM_PRO: 'law_firm_pro',
  AGENCY_STARTER: 'agency_starter',
  AGENCY_PRO: 'agency_pro',
  ENTERPRISE: 'enterprise',
} as const;

export const SUBSCRIPTION_STATUSES = {
  ACTIVE: 'active',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  UNPAID: 'unpaid',
  PAUSED: 'paused',
} as const;

export const BILLING_INTERVALS = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
} as const;

export const DEFAULT_PLAN_LIMITS = {
  [SUBSCRIPTION_PLANS.FREE]: {
    maxUsers: 1,
    maxCases: 3,
    storageGb: 1,
    hasChat: false,
    hasAnalytics: false,
  },
  [SUBSCRIPTION_PLANS.SOLO_ADVOCATE]: {
    maxUsers: 1,
    maxCases: 50,
    storageGb: 10,
    hasChat: true,
    hasAnalytics: false,
  },
  [SUBSCRIPTION_PLANS.SOLO_DETECTIVE]: {
    maxUsers: 1,
    maxCases: 30,
    storageGb: 10,
    hasChat: true,
    hasAnalytics: false,
  },
  [SUBSCRIPTION_PLANS.LAW_FIRM_STARTER]: {
    maxUsers: 10,
    maxCases: 200,
    storageGb: 50,
    hasChat: true,
    hasAnalytics: true,
  },
  [SUBSCRIPTION_PLANS.LAW_FIRM_PRO]: {
    maxUsers: 50,
    maxCases: 1000,
    storageGb: 200,
    hasChat: true,
    hasAnalytics: true,
  },
  [SUBSCRIPTION_PLANS.AGENCY_STARTER]: {
    maxUsers: 10,
    maxCases: 100,
    storageGb: 50,
    hasChat: true,
    hasAnalytics: true,
  },
  [SUBSCRIPTION_PLANS.AGENCY_PRO]: {
    maxUsers: 30,
    maxCases: 500,
    storageGb: 150,
    hasChat: true,
    hasAnalytics: true,
  },
  [SUBSCRIPTION_PLANS.ENTERPRISE]: {
    maxUsers: -1, // unlimited
    maxCases: -1,
    storageGb: -1,
    hasChat: true,
    hasAnalytics: true,
  },
} as const;

export type SubscriptionPlanKey = (typeof SUBSCRIPTION_PLANS)[keyof typeof SUBSCRIPTION_PLANS];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[keyof typeof SUBSCRIPTION_STATUSES];
