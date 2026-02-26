import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrgSubscriptionsService } from '../services/org-subscriptions.service';
import { SubscriptionPlansService } from '../services/subscription-plans.service';
import { SubscribeDto, CancelSubscriptionDto } from '../dto/org-subscription.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../common/guards/permissions.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { FEATURE_KEYS } from '../../../common/constants/permissions.constants';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrgId } from '../../../common/decorators/org-id.decorator';
import { successResponse } from '../../../common/utils/response.util';

@ApiTags('Organization - Subscriptions')
@Controller('subscriptions')
export class OrgSubscriptionsController {
    constructor(
        private readonly service: OrgSubscriptionsService,
        private readonly planService: SubscriptionPlansService,
    ) { }

    @Get('plans')
    @ApiOperation({ summary: 'List all available public plans' })
    async getPublicPlans() {
        const data = await this.planService.getPublicPlans();
        return successResponse(data, 'Available plans retrieved successfully');
    }

    @Get('my')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @Permission(FEATURE_KEYS.SUB_VIEW)
    @ApiOperation({ summary: "Get organization's current subscription" })
    async getMySubscription(@OrgId() orgId: string) {
        const data = await this.service.getOrgSubscription(orgId);
        return successResponse(data, 'Organization subscription retrieved');
    }

    @Post('subscribe')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @Permission(FEATURE_KEYS.SUB_MANAGE)
    @ApiOperation({ summary: 'Subscribe or change plan' })
    async subscribe(
        @Body() dto: SubscribeDto,
        @OrgId() orgId: string,
        @CurrentUser('id') userId: string,
    ) {
        const data = await this.service.subscribe(orgId, dto.planId, userId);
        return successResponse(data, 'Subscription updated successfully');
    }

    @Post('cancel')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @Permission(FEATURE_KEYS.SUB_MANAGE)
    @ApiOperation({ summary: 'Cancel current subscription' })
    async cancel(
        @Body() dto: CancelSubscriptionDto,
        @OrgId() orgId: string,
        @CurrentUser('id') userId: string,
    ) {
        const data = await this.service.cancelSubscription(orgId, dto.reason, userId);
        return successResponse(data, 'Subscription cancelled successfully');
    }
}
