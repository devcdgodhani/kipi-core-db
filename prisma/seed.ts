import { PrismaClient, AppType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding JusticeLynk enterprise database...');

  // ── 1. Create Super Admin User ─────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@JL2024!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@justicelynk.com' },
    update: {},
    create: {
      email: 'admin@justicelynk.com',
      firstName: 'JusticeLynk',
      lastName: 'Admin',
      userType: 'super_admin',
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

  // ── 2. Define App Modules, Screens & Actions ───────────────
  const appsData = [
    {
      appType: AppType.ADMIN_WEB,
      modules: [
        {
          key: 'admin.dashboard',
          name: 'Admin Dashboard',
          screens: [
            { key: 'admin.overview', name: 'Overview', path: '/admin', actions: ['read', 'export'] },
          ],
        },
        {
          key: 'admin.users',
          name: 'User Management',
          screens: [
            { key: 'admin.users.list', name: 'User Management', path: '/admin/users', actions: ['read', 'create', 'update', 'delete', 'suspend'] },
            { key: 'admin.users.details', name: 'User Details', path: '/admin/users/[id]', actions: ['read', 'update', 'reset_password'] },
          ],
        },
        {
          key: 'admin.organizations',
          name: 'Organization Management',
          screens: [
            { key: 'admin.orgs.list', name: 'Organizations', path: '/admin/organizations', actions: ['read', 'create', 'update', 'delete'] },
            { key: 'admin.orgs.create', name: 'New Organization', path: '/admin/organizations/new', actions: ['read', 'create'] },
            { key: 'admin.orgs.details', name: 'Organization Details', path: '/admin/organizations/[id]', actions: ['read', 'update', 'verify', 'suspend'] },
          ],
        },
        {
          key: 'admin.professionals',
          name: 'Professional Verification',
          screens: [
            { key: 'admin.professionals.list', name: 'Professionals', path: '/admin/professionals', actions: ['read', 'verify', 'reject'] },
            { key: 'admin.professionals.details', name: 'Professional Details', path: '/admin/professionals/[id]', actions: ['read', 'update'] },
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
          screens: [
            { key: 'dashboard.overview', name: 'Dashboard', path: '/dashboard', actions: ['read'] },
          ],
        },
        {
          key: 'main.cases',
          name: 'Case Management',
          screens: [
            { key: 'cases.list', name: 'Case Portfolio', path: '/cases', actions: ['read', 'create', 'export'] },
            { key: 'cases.details', name: 'Case Details', path: '/cases/[id]', actions: ['read', 'update', 'assign', 'close', 'delete'] },
            { key: 'cases.create', name: 'New Case', path: '/cases/create', actions: ['read', 'create'] },
          ],
        },
        {
          key: 'main.organizations',
          name: 'Organization',
          screens: [
            { key: 'organization.settings', name: 'Organization Settings', path: '/organization', actions: ['read', 'update', 'manage'] },
          ],
        },
        {
          key: 'main.team',
          name: 'Team & Members',
          screens: [
            { key: 'team.list', name: 'Team Members', path: '/organization/members', actions: ['read', 'invite', 'remove', 'update'] },
            { key: 'team.roles', name: 'Roles & Permissions', path: '/organization/roles', actions: ['read', 'create', 'update', 'delete'] },
          ],
        },
        {
          key: 'main.billing',
          name: 'Billing & Plans',
          screens: [
            { key: 'billing.overview', name: 'Billing', path: '/billing', actions: ['read', 'manage'] },
          ],
        },
        {
          key: 'main.chat',
          name: 'Justice Chat',
          screens: [
            { key: 'chat.hub', name: 'Message Center', path: '/chat', actions: ['read', 'send', 'delete'] },
          ],
        },
        {
          key: 'main.professionals',
          name: 'Marketplace',
          screens: [
            { key: 'professionals.marketplace', name: 'Professionals', path: '/professionals', actions: ['read', 'hire'] },
          ],
        },
        {
          key: 'main.notifications',
          name: 'Notifications',
          screens: [
            { key: 'notifications.center', name: 'Notifications', path: '/notifications', actions: ['read', 'update', 'delete'] },
          ],
        },
        {
          key: 'main.settings',
          name: 'Account Settings',
          screens: [
            { key: 'user.settings', name: 'Security & Settings', path: '/settings', actions: ['read', 'update'] },
          ],
        },
      ],
    },
  ];

  for (const app of appsData) {
    for (const mod of app.modules) {
      // Create/Upsert Module
      const upsertedMod = await prisma.module.upsert({
        where: { key: mod.key },
        update: { name: mod.name, appType: app.appType },
        create: { key: mod.key, name: mod.name, appType: app.appType },
      });

      for (const scr of mod.screens) {
        // Create/Upsert Screen
        const upsertedScr = await prisma.screen.upsert({
          where: { key: scr.key },
          update: { name: scr.name, path: scr.path, moduleId: upsertedMod.id },
          create: { key: scr.key, name: scr.name, path: scr.path, moduleId: upsertedMod.id },
        });

        // Create/Upsert Actions for this Screen
        for (const actionKey of scr.actions) {
          await prisma.action.upsert({
            where: { screenId_key: { screenId: upsertedScr.id, key: actionKey } },
            update: { name: actionKey.charAt(0).toUpperCase() + actionKey.slice(1) },
            create: {
              screenId: upsertedScr.id,
              key: actionKey,
              name: actionKey.charAt(0).toUpperCase() + actionKey.slice(1),
            },
          });
        }
      }
    }
  }
  console.log('✅ Modules, Screens, and Actions seeded for all apps.');

  // ── 3. Create System Roles & Grant All to Super Admin ─────────
  const rolesData = [
    { name: 'Super Admin', slug: 'super_admin', description: 'Full platform access', isSystem: true },
  ];

  for (const roleDef of rolesData) {
    let role = await prisma.role.findFirst({
      where: { orgId: null, slug: roleDef.slug },
    });

    if (role) {
      role = await prisma.role.update({
        where: { id: role.id },
        data: { name: roleDef.name, description: roleDef.description },
      });
    } else {
      role = await prisma.role.create({
        data: { ...roleDef, orgId: null },
      });
    }

    // Super Admin gets EVERYTHING (Screen-based)
    if (role.slug === 'super_admin') {
      const allScreens = await prisma.screen.findMany({ include: { actions: true } });
      for (const screen of allScreens) {
        for (const action of screen.actions) {
          await prisma.rolePermission.upsert({
            where: { roleId_screenId_actionId: { roleId: role.id, screenId: screen.id, actionId: action.id } },
            update: { granted: true },
            create: {
              roleId: role.id,
              screenId: screen.id,
              actionId: action.id,
              granted: true,
            },
          });
        }
      }
    }
  }
  console.log(`✅ System roles seeded.`);

  console.log('\n🎉 Enterprise seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
