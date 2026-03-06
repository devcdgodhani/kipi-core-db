import { PrismaClient, AppType, UserType, ApprovalStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding JusticeLynk enterprise database...');

  // ── 1. Create Super Admin User ─────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@JL2026!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@justicelynk.com' },
    update: {
      userType: UserType.super_admin,
      approvalStatus: ApprovalStatus.approved,
    },
    create: {
      email: 'admin@justicelynk.com',
      firstName: 'JusticeLynk',
      lastName: 'Admin',
      userType: UserType.super_admin,
      approvalStatus: ApprovalStatus.approved,
      isActive: true,
      isVerified: true,
      security: {
        create: {
          passwordHash,
          mfaEnabled: false,
          mfaBackupCodes: [],
        },
      },
    },
  });
  console.log(`✅ Super Admin: ${superAdmin.email}`);

  // ── 2. Define App Modules, Features & Actions ──────────────
  const appsData = [
    {
      appType: AppType.ADMIN_WEB,
      modules: [
        {
          key: 'admin.dashboard',
          name: 'Dashboard',
          path: '/admin',
          targetUserTypes: [UserType.super_admin, UserType.admin],
          features: [
            { key: 'admin.overview', name: 'Overview', path: '/admin', actions: ['read', 'export'], targetUserTypes: [UserType.super_admin, UserType.admin] },
          ],
        },
        {
          key: 'admin.user-management',
          name: 'User Management',
          path: '/admin/users',
          targetUserTypes: [UserType.super_admin, UserType.admin],
          features: [
            { key: 'users', name: 'Users', path: '/admin/users', actions: ['read', 'create', 'update', 'delete', 'suspend', 'unsuspend'], targetUserTypes: [UserType.super_admin, UserType.admin] },
            { key: 'clients', name: 'Clients', path: '/admin/users/clients', actions: ['read'], targetUserTypes: [UserType.super_admin, UserType.admin] },
            { key: 'account-requests', name: 'Account Requests', path: '/admin/users/requests', actions: ['read', 'approve', 'reject'], targetUserTypes: [UserType.super_admin, UserType.admin] },
          ],
        },
        {
          key: 'admin.organizations',
          name: 'Organizations',
          path: '/admin/organizations',
          targetUserTypes: [UserType.super_admin, UserType.admin],
          features: [
            { key: 'orgs', name: 'Organizations', path: '/admin/organizations', actions: ['read', 'create', 'update', 'delete'], targetUserTypes: [UserType.super_admin, UserType.admin] },
          ],
        },
        {
          key: 'admin.professionals',
          name: 'Professionals',
          path: '/admin/professionals',
          targetUserTypes: [UserType.super_admin, UserType.admin],
          features: [
            { key: 'profs', name: 'Professionals', path: '/admin/professionals', actions: ['read', 'create', 'update', 'delete', 'verify'], targetUserTypes: [UserType.super_admin, UserType.admin] },
          ],
        },
        {
          key: 'admin.roles',
          name: 'Roles & Permissions',
          path: '/admin/roles',
          targetUserTypes: [UserType.super_admin, UserType.admin],
          features: [
            { key: 'roles', name: 'Roles', path: '/admin/roles', actions: ['read', 'create', 'update', 'delete'], targetUserTypes: [UserType.super_admin, UserType.admin] },
            { key: 'permissions', name: 'Permissions', path: '/admin/roles/permissions', actions: ['read', 'update'], targetUserTypes: [UserType.super_admin, UserType.admin] },
          ],
        },
        {
          key: 'admin.subscriptions',
          name: 'Subscription Plans',
          path: '/admin/subscription-plans',
          targetUserTypes: [UserType.super_admin],
          features: [
            { key: 'plans', name: 'Plans', path: '/admin/subscription-plans', actions: ['read', 'create', 'update', 'delete'], targetUserTypes: [UserType.super_admin] },
          ],
        },
        {
          key: 'admin.audit',
          name: 'Audit Logs',
          path: '/admin/audit',
          targetUserTypes: [UserType.super_admin],
          features: [
            { key: 'audit.logs', name: 'Audit Logs', path: '/admin/audit', actions: ['read', 'export'], targetUserTypes: [UserType.super_admin] },
          ],
        },
        {
          key: 'admin.billing',
          name: 'Revenue Analytics',
          path: '/admin/billing',
          targetUserTypes: [UserType.super_admin],
          features: [
            { key: 'billing.analytics', name: 'Analytics', path: '/admin/billing', actions: ['read', 'export'], targetUserTypes: [UserType.super_admin] },
          ],
        },
        {
          key: 'admin.notifications',
          name: 'System Logs',
          path: '/notifications',
          targetUserTypes: [UserType.super_admin, UserType.admin],
          features: [
            { key: 'system.logs', name: 'Logs', path: '/notifications', actions: ['read'], targetUserTypes: [UserType.super_admin, UserType.admin] },
          ],
        },
        {
          key: 'admin.settings',
          name: 'System Settings',
          path: '/admin/settings',
          targetUserTypes: [UserType.super_admin],
          features: [
            { key: 'general-settings', name: 'General', path: '/admin/settings', actions: ['read', 'update'], targetUserTypes: [UserType.super_admin] },
          ],
        },
      ],
    },
    {
      appType: AppType.MAIN_WEB,
      modules: [
        {
          key: 'main.dashboard',
          name: 'Dashboard',
          path: '/dashboard',
          targetUserTypes: [UserType.client],
          features: [
            { key: 'client.overview', name: 'Overview', path: '/dashboard', actions: ['read'], targetUserTypes: [UserType.client] },
          ],
        },
        {
          key: 'professional.dashboard',
          name: 'Professional Dashboard',
          path: '/professional',
          targetUserTypes: [UserType.advocate],
          features: [
            { key: 'professional.overview', name: 'Overview', path: '/professional', actions: ['read'], targetUserTypes: [UserType.advocate] },
          ],
        },
        {
          key: 'lawfirm.dashboard',
          name: 'Law Firm Dashboard',
          path: '/law-firm',
          targetUserTypes: [UserType.law_firm_admin],
          features: [
            { key: 'lawfirm.overview', name: 'Overview', path: '/law-firm', actions: ['read'], targetUserTypes: [UserType.law_firm_admin] },
          ],
        },
        {
          key: 'main.cases',
          name: 'Case Management',
          path: '/cases',
          targetUserTypes: [UserType.client, UserType.advocate, UserType.law_firm_admin],
          features: [
            { key: 'cases.list', name: 'Cases', path: '/cases', actions: ['read', 'create', 'export'], targetUserTypes: [UserType.client, UserType.advocate, UserType.law_firm_admin] },
            { key: 'cases.details', name: 'Case Details', path: '/cases/:id', actions: ['read', 'update', 'assign', 'close', 'delete'], targetUserTypes: [UserType.client, UserType.advocate, UserType.law_firm_admin] },
          ],
        },
        {
          key: 'main.chat',
          name: 'Justice Chat',
          path: '/chat',
          targetUserTypes: [UserType.client, UserType.advocate, UserType.law_firm_admin],
          features: [
            { key: 'chat.messages', name: 'Messages', path: '/chat', actions: ['read', 'send', 'delete'], targetUserTypes: [UserType.client, UserType.advocate, UserType.law_firm_admin] },
          ],
        },
        {
          key: 'main.professionals',
          name: 'Marketplace',
          path: '/professionals',
          targetUserTypes: [UserType.client],
          features: [
            { key: 'professionals.mkt', name: 'Marketplace', path: '/professionals', actions: ['read', 'hire'], targetUserTypes: [UserType.client] },
          ],
        },
        {
          key: 'main.organization',
          name: 'Law Firm',
          path: '/organization',
          targetUserTypes: [UserType.law_firm_admin],
          features: [
            { key: 'org.team', name: 'Team', path: '/organization', actions: ['read', 'invite', 'remove', 'update'], targetUserTypes: [UserType.law_firm_admin] },
            { key: 'org.settings', name: 'Settings', path: '/organization', actions: ['read', 'update'], targetUserTypes: [UserType.law_firm_admin] },
          ],
        },
        {
          key: 'main.billing',
          name: 'Billing',
          path: '/billing',
          targetUserTypes: [UserType.client, UserType.advocate, UserType.law_firm_admin],
          features: [
            { key: 'user.billing', name: 'Billing', path: '/billing', actions: ['read', 'update'], targetUserTypes: [UserType.client, UserType.advocate, UserType.law_firm_admin] },
          ],
        },
        {
          key: 'main.notifications',
          name: 'Notifications',
          path: '/notifications',
          targetUserTypes: [UserType.client, UserType.advocate, UserType.law_firm_admin],
          features: [
            { key: 'user.notifications', name: 'Notifications', path: '/notifications', actions: ['read', 'update'], targetUserTypes: [UserType.client, UserType.advocate, UserType.law_firm_admin] },
          ],
        },
        {
          key: 'main.settings',
          name: 'Settings',
          path: '/settings',
          targetUserTypes: [UserType.client, UserType.advocate, UserType.law_firm_admin],
          features: [
            { key: 'user.profile', name: 'Profile', path: '/settings', actions: ['read', 'update'], targetUserTypes: [UserType.client, UserType.advocate, UserType.law_firm_admin] },
            { key: 'user.security', name: 'Security', path: '/settings', actions: ['read', 'update'], targetUserTypes: [UserType.client, UserType.advocate, UserType.law_firm_admin] },
            { key: 'user.storage', name: 'File Storage', path: '/settings', actions: ['read', 'create', 'update', 'delete', 'upload', 'download'], targetUserTypes: [UserType.client, UserType.advocate, UserType.law_firm_admin] },
          ],
        },
      ],
    },
  ];

  // ── 2. Sync App Modules, Features & Actions ──────────────────
  // Strategy: upsert defined records, delete anything not in the seed.

  // Collect all canonical keys from seed definition
  const seedModuleKeys: string[] = [];
  const seedFeatureKeys: string[] = [];

  for (const app of appsData) {
    for (const moduleData of app.modules) {
      seedModuleKeys.push(moduleData.key);
      for (const featureData of moduleData.features) {
        seedFeatureKeys.push(featureData.key);
      }
    }
  }

  // ── Delete modules not in seed (cascades features → actions → role_permissions)
  await prisma.module.deleteMany({ where: { key: { notIn: seedModuleKeys } } });

  // ── Delete features not in seed (cascades actions → role_permissions)
  await prisma.feature.deleteMany({ where: { key: { notIn: seedFeatureKeys } } });
  // Note: orphaned actions within surviving features are deleted inline per-feature below.

  // ── Upsert modules, features, actions in seed order
  for (const app of appsData) {
    for (const moduleData of app.modules) {
      const module = await prisma.module.upsert({
        where: { key: moduleData.key },
        update: {
          name: moduleData.name,
          appType: app.appType,
          path: (moduleData as any).path,
          targetUserTypes: moduleData.targetUserTypes,
        },
        create: {
          key: moduleData.key,
          name: moduleData.name,
          appType: app.appType,
          path: (moduleData as any).path,
          targetUserTypes: moduleData.targetUserTypes,
        },
      });

      for (const featureData of moduleData.features) {
        const feature = await prisma.feature.upsert({
          where: { key: featureData.key },
          update: {
            name: featureData.name,
            moduleId: module.id,
            path: (featureData as any).path,
            targetUserTypes: featureData.targetUserTypes,
          },
          create: {
            key: featureData.key,
            name: featureData.name,
            moduleId: module.id,
            path: (featureData as any).path,
            targetUserTypes: featureData.targetUserTypes,
          },
        });

        // Delete actions in this feature that are NOT in the seed
        await prisma.action.deleteMany({
          where: {
            featureId: feature.id,
            key: { notIn: featureData.actions },
          },
        });

        // Upsert defined actions
        for (const actionKey of featureData.actions) {
          await prisma.action.upsert({
            where: { featureId_key: { featureId: feature.id, key: actionKey } },
            update: {
              name: actionKey.charAt(0).toUpperCase() + actionKey.slice(1).replace(/_/g, ' '),
            },
            create: {
              featureId: feature.id,
              key: actionKey,
              name: actionKey.charAt(0).toUpperCase() + actionKey.slice(1).replace(/_/g, ' '),
            },
          });
        }
      }
    }
  }
  console.log('✅ Modules, Features, and Actions synced (add/update/delete).');

  // ── 4. Seed Initial Subscription Plans ─────────────────────
  const plansData = [
    {
      name: 'Free Client',
      slug: 'client-free',
      targetUserType: UserType.client,
      monthlyPrice: 0,
      yearlyPrice: 0,
      isActive: true,
      description: 'The essential foundation for individual legal sovereignty.',
      limits: [
        { key: 'maxUsers', value: 1 },
        { key: 'maxCases', value: 3 },
        { key: 'storageGb', value: 1 },
      ]
    },
    {
      name: 'Professional Basic',
      slug: 'professional-basic',
      targetUserType: UserType.advocate,
      monthlyPrice: 999,
      yearlyPrice: 9999,
      isActive: true,
      description: 'High-performance workspace for established legal practitioners.',
      limits: [
        { key: 'maxUsers', value: 1 },
        { key: 'maxCases', value: 25 },
        { key: 'storageGb', value: 10 },
      ]
    },
    {
      name: 'Firm Standard',
      slug: 'firm-standard',
      targetUserType: UserType.law_firm_admin,
      monthlyPrice: 4999,
      yearlyPrice: 49999,
      isActive: true,
      description: 'Enterprise-grade infrastructure for collaborative firm architecture.',
      limits: [
        { key: 'maxUsers', value: 10 },
        { key: 'maxCases', value: -1 },
        { key: 'storageGb', value: 100 },
      ]
    },
  ];


  for (const plan of plansData as any) {
    const { limits, ...planFields } = plan;
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: {
        ...planFields,
        limits: {
          deleteMany: {},
          create: limits?.map((l: any) => ({ key: l.key, value: l.value }))
        }
      },
      create: {
        ...planFields,
        limits: {
          create: limits?.map((l: any) => ({ key: l.key, value: l.value }))
        }
      },
    });
  }
  console.log('✅ Initial subscription plans seeded.');
  console.log('\n🎉 Enterprise seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
