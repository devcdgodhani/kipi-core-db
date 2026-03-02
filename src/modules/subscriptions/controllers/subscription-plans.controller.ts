import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionPlansService } from '../services/subscription-plans.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from '../dto/subscription-plans.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PlanAccessGuard } from '../../../common/guards/plan-access.guard';
import { RequiresPlanAccess } from '../../../common/decorators/plan-access.decorator';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { successResponse } from '../../../common/utils/response.util';

@ApiTags('Admin - Subscription Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlanAccessGuard)
@RequiresPlanAccess({ moduleKey: MODULE_KEYS.ADMIN_SUBSCRIPTIONS })
@Controller({ path: 'admin/subscription-plans', version: '1' })
export class SubscriptionPlansController {
    constructor(private readonly service: SubscriptionPlansService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new subscription plan' })
    async createPlan(
        @Body() dto: CreateSubscriptionPlanDto,
        @CurrentUser('sub') userId: string,
    ) {
        const data = await this.service.createPlan(dto, userId);
        return successResponse(data, 'Subscription plan created successfully');
    }

    @Get()
    @ApiOperation({ summary: 'List all subscription plans' })
    async getAllPlans() {
        const data = await this.service.getAllPlans();
        return successResponse(data, 'All plans retrieved successfully');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get plan details' })
    async getPlanById(@Param('id') id: string) {
        const data = await this.service.getPlanById(id);
        return successResponse(data, 'Plan details retrieved successfully');
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a subscription plan' })
    async updatePlan(
        @Param('id') id: string,
        @Body() dto: UpdateSubscriptionPlanDto,
        @CurrentUser('sub') userId: string,
    ) {
        const data = await this.service.updatePlan(id, dto, userId);
        return successResponse(data, 'Plan updated successfully');
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete or deactivate a plan' })
    async deletePlan(@Param('id') id: string, @CurrentUser('sub') userId: string) {
        await this.service.deletePlan(id, userId);
        return successResponse(null, 'Plan processed successfully');
    }
}
