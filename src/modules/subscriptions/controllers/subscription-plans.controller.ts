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
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from '../dto/subscription-plan.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../common/guards/permissions.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { FEATURE_KEYS } from '../../../common/constants/permissions.constants';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { successResponse } from '../../../common/utils/response.util';

@ApiTags('Admin - Subscription Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin/subscription-plans')
export class SubscriptionPlansController {
    constructor(private readonly service: SubscriptionPlansService) { }

    @Post()
    @Permission(FEATURE_KEYS.SUB_MANAGE)
    @ApiOperation({ summary: 'Create a new subscription plan' })
    async createPlan(
        @Body() dto: CreateSubscriptionPlanDto,
        @CurrentUser('id') userId: string,
    ) {
        const data = await this.service.createPlan(dto, userId);
        return successResponse(data, 'Subscription plan created successfully');
    }

    @Get()
    @Permission(FEATURE_KEYS.SUB_VIEW)
    @ApiOperation({ summary: 'List all subscription plans' })
    async getAllPlans() {
        const data = await this.service.getAllPlans();
        return successResponse(data, 'All plans retrieved successfully');
    }

    @Get(':id')
    @Permission(FEATURE_KEYS.SUB_VIEW)
    @ApiOperation({ summary: 'Get plan details' })
    async getPlanById(@Param('id') id: string) {
        const data = await this.service.getPlanById(id);
        return successResponse(data, 'Plan details retrieved successfully');
    }

    @Put(':id')
    @Permission(FEATURE_KEYS.SUB_MANAGE)
    @ApiOperation({ summary: 'Update a subscription plan' })
    async updatePlan(
        @Param('id') id: string,
        @Body() dto: UpdateSubscriptionPlanDto,
        @CurrentUser('id') userId: string,
    ) {
        const data = await this.service.updatePlan(id, dto, userId);
        return successResponse(data, 'Plan updated successfully');
    }

    @Delete(':id')
    @Permission(FEATURE_KEYS.SUB_MANAGE)
    @ApiOperation({ summary: 'Delete or deactivate a plan' })
    async deletePlan(@Param('id') id: string, @CurrentUser('id') userId: string) {
        await this.service.deletePlan(id, userId);
        return successResponse(null, 'Plan processed successfully');
    }
}
