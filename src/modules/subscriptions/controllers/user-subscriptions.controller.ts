import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserSubscriptionsService } from '../services/user-subscriptions.service';
import { SubscriptionPlansService } from '../services/subscription-plans.service';
import { SubscribeDto, CancelSubscriptionDto } from '../dto/user-subscriptions.dto';
import { AuthService } from '../../auth/services/auth.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { successResponse } from '../../../common/utils/response.util';

@ApiTags('User - Subscriptions')
@Controller({ path: 'subscriptions', version: '1' })
export class UserSubscriptionsController {
    constructor(
        private readonly service: UserSubscriptionsService,
        private readonly planService: SubscriptionPlansService,
        private readonly authService: AuthService,
    ) { }

    @Get('plans')
    @ApiOperation({ summary: 'List all available public plans' })
    async getPublicPlans(@Query('userType') userType?: any) {
        const data = await this.planService.getPublicPlans(userType);
        return successResponse(data, 'Available plans retrieved successfully');
    }

    @Get('plans/:id')
    @ApiOperation({ summary: 'Get details of a specific plan' })
    async getPlanById(@Param('id') id: string) {
        const data = await this.planService.getPlanById(id);
        return successResponse(data, 'Plan details retrieved successfully');
    }

    @Get('my')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "Get current user's subscription" })
    async getMySubscription(@CurrentUser('sub') userId: string) {
        const data = await this.service.getUserSubscription(userId);
        return successResponse(data, 'User subscription retrieved');
    }

    @Post('select-plan')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Select or upgrade a subscription plan' })
    async selectPlan(
        @Body() dto: SubscribeDto,
        @CurrentUser() user: any,
    ) {
        const sub = await this.service.subscribe(user.sub, dto.planId, dto.billingInterval);

        // Generate new tokens with hasPlan: true
        const tokens = await this.authService.generateTokens({
            id: user.sub,
            email: user.email,
            userType: user.userType,
            approvalStatus: user.approvalStatus,
            subscription: sub,
        }, user.mfaVerified, user.sid);

        return successResponse({
            subscription: sub,
            ...tokens,
        }, 'Subscription updated successfully');
    }

    @Post('subscribe')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Alias for select-plan' })
    async subscribe(
        @Body() dto: SubscribeDto,
        @CurrentUser('sub') userId: string,
    ) {
        return this.selectPlan(dto, userId);
    }

    @Post('cancel')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Cancel current subscription' })
    async cancel(
        @Body() dto: CancelSubscriptionDto,
        @CurrentUser('sub') userId: string,
    ) {
        const data = await this.service.cancelSubscription(userId, dto.reason);
        return successResponse(data, 'Subscription cancelled successfully');
    }
}
