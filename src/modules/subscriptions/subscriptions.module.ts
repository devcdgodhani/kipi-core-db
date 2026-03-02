import { Module } from '@nestjs/common';
import { SubscriptionPlansController } from './controllers/subscription-plans.controller';
import { UserSubscriptionsController } from './controllers/user-subscriptions.controller';
import { SubscriptionPlansService } from './services/subscription-plans.service';
import { UserSubscriptionsService } from './services/user-subscriptions.service';
import { SubscriptionPlansRepository } from './repositories/subscription-plans.repository';
import { UserSubscriptionsRepository } from './repositories/user-subscriptions.repository';
import { RedisModule } from '../../database/redis.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [RedisModule, AuditModule, AuthModule],
    controllers: [SubscriptionPlansController, UserSubscriptionsController],
    providers: [
        SubscriptionPlansService,
        UserSubscriptionsService,
        SubscriptionPlansRepository,
        UserSubscriptionsRepository,
    ],
    exports: [SubscriptionPlansService, UserSubscriptionsService],
})
export class SubscriptionsModule { }
