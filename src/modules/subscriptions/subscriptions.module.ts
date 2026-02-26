import { Module } from '@nestjs/common';
import { SubscriptionPlansController } from './controllers/subscription-plans.controller';
import { OrgSubscriptionsController } from './controllers/org-subscriptions.controller';
import { SubscriptionPlansService } from './services/subscription-plans.service';
import { OrgSubscriptionsService } from './services/org-subscriptions.service';
import { SubscriptionPlansRepository } from './repositories/subscription-plans.repository';
import { OrgSubscriptionsRepository } from './repositories/org-subscriptions.repository';
import { RedisModule } from '../../database/redis.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [RedisModule, AuditModule],
    controllers: [SubscriptionPlansController, OrgSubscriptionsController],
    providers: [
        SubscriptionPlansService,
        OrgSubscriptionsService,
        SubscriptionPlansRepository,
        OrgSubscriptionsRepository,
    ],
    exports: [SubscriptionPlansService, OrgSubscriptionsService],
})
export class SubscriptionsModule { }
