import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

// ── Shared ──────────────────────────────────────────────────
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

// ── Config ──────────────────────────────────────────────────
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import awsConfig from './config/aws.config';
import paymentConfig from './config/payment.config';

// ── Database ────────────────────────────────────────────────
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './database/redis.module';

// ── Modules ─────────────────────────────────────────────────
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SecurityModule } from './modules/security/security.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RolesPermissionsModule } from './modules/roles-permissions/roles-permissions.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CasesModule } from './modules/cases/cases.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    // ── Configuration ────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, awsConfig, paymentConfig],
      expandVariables: true,
    }),

    // ── Rate Limiting ────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          { name: 'short', ttl: 1000, limit: 10 },
          { name: 'medium', ttl: 10000, limit: 50 },
          { name: 'long', ttl: 60000, limit: 100 },
        ],
      }),
    }),

    // ── Infrastructure ───────────────────────────────────────
    PrismaModule,
    RedisModule,

    // ── Feature Modules ──────────────────────────────────────
    AuthModule,
    UsersModule,
    SecurityModule,
    ProfessionalsModule,
    OrganizationsModule,
    RolesPermissionsModule,
    SubscriptionModule,
    PaymentsModule,
    CasesModule,
    ChatModule,
    NotificationsModule,
    AuditModule,
    AdminModule,
  ],
  providers: [
    // Global rate-limiter guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global JWT auth guard
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global Audit interceptor
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule { }
