"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding JusticeLynk database...');
    const passwordHash = await bcrypt.hash('Admin@JL2024!', 12);
    const superAdmin = await prisma.user.upsert({
        where: { email: 'admin@justicelynk.com' },
        update: {},
        create: {
            email: 'admin@justicelynk.com',
            firstName: 'Super',
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
    const moduleData = [
        { key: 'cases', name: 'Case Management', description: 'Manage legal cases' },
        { key: 'organizations', name: 'Organizations', description: 'Manage organizations and members' },
        { key: 'billing', name: 'Billing', description: 'Subscription and payments' },
        { key: 'chat', name: 'Chat & Messaging', description: 'Real-time messaging' },
        { key: 'documents', name: 'Documents', description: 'Case document management' },
        { key: 'reports', name: 'Reports & Analytics', description: 'Analytics and reporting' },
        { key: 'audit', name: 'Audit Logs', description: 'System audit trails' },
    ];
    for (const mod of moduleData) {
        await prisma.module.upsert({
            where: { key: mod.key },
            update: {},
            create: { ...mod, isActive: true },
        });
    }
    console.log(`✅ Created ${moduleData.length} modules`);
    const plans = [
        {
            name: 'Starter',
            slug: 'starter',
            description: 'For individuals and solo lawyers',
            price: 0,
            billingInterval: 'monthly',
            trialDays: 14,
            isActive: true,
            isPublic: true,
        },
        {
            name: 'Professional',
            slug: 'professional',
            description: 'For small law firms and legal professionals',
            price: 2999,
            billingInterval: 'monthly',
            trialDays: 7,
            isActive: true,
            isPublic: true,
        },
        {
            name: 'Enterprise',
            slug: 'enterprise',
            description: 'For large organizations and enterprises',
            price: 9999,
            billingInterval: 'monthly',
            trialDays: 0,
            isActive: true,
            isPublic: true,
        },
    ];
    for (const plan of plans) {
        await prisma.subscriptionPlan.upsert({
            where: { slug: plan.slug },
            update: {},
            create: plan,
        });
    }
    console.log(`✅ Created ${plans.length} subscription plans`);
    const roles = [
        { name: 'Super Admin', slug: 'super_admin', description: 'Full platform access', isSystem: true },
        { name: 'Org Admin', slug: 'org_admin', description: 'Organization administrator', isSystem: true },
        { name: 'Org Member', slug: 'org_member', description: 'Organization member', isSystem: true },
        { name: 'Lawyer', slug: 'lawyer', description: 'Legal professional', isSystem: true },
        { name: 'Client', slug: 'client', description: 'End client', isSystem: true },
    ];
    for (const role of roles) {
        await prisma.role.upsert({
            where: { orgId_slug: { orgId: null, slug: role.slug } },
            update: {},
            create: { ...role, orgId: null },
        });
    }
    console.log(`✅ Created ${roles.length} system roles`);
    console.log('\n🎉 Seeding complete!');
    console.log('📧 Admin Email: admin@justicelynk.com');
    console.log('🔑 Admin Password: Admin@JL2024!');
    console.log('⚠️  Please change the admin password immediately after first login!');
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map