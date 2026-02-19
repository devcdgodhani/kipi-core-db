import {
  Controller, Get, Post, Patch, Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BillingInterval } from '@prisma/client';
import { SubscriptionService } from '../services/subscription.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrgId } from '../../../common/decorators/org-id.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SYSTEM_ROLES } from '../../../common/constants/roles.constants';
import { successResponse } from '../../../common/utils/response.util';

class CreatePlanDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() slug: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) price: number;
  @ApiPropertyOptional({ enum: BillingInterval }) @IsOptional() @IsEnum(BillingInterval) billingInterval?: BillingInterval;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) trialDays?: number;
}

class SubscribeDto {
  @ApiProperty() @IsString() planId: string;
}

@ApiTags('Subscriptions')
@ApiBearerAuth('accessToken')
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) { }

  @Get('plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  async getPlans() {
    return successResponse(await this.subscriptionService.getPlans());
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get plan details' })
  async getPlan(@Param('id') id: string) {
    return successResponse(await this.subscriptionService.getPlanById(id));
  }

  @Post('plans')
  @Roles(SYSTEM_ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a subscription plan (super admin only)' })
  async createPlan(@Body() dto: CreatePlanDto, @CurrentUser() user: JwtPayload) {
    return successResponse(await this.subscriptionService.createPlan(dto, user.sub), 'Plan created');
  }

  @Patch('plans/:id')
  @Roles(SYSTEM_ROLES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a plan (super admin only)' })
  async updatePlan(@Param('id') id: string, @Body() dto: Partial<CreatePlanDto>, @CurrentUser() user: JwtPayload) {
    return successResponse(await this.subscriptionService.updatePlan(id, dto, user.sub), 'Plan updated');
  }

  @Get('my')
  @ApiOperation({ summary: "Get organization's current subscription" })
  async getMySubscription(@OrgId() orgId: string) {
    return successResponse(await this.subscriptionService.getOrgSubscription(orgId));
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe organization to a plan' })
  async subscribe(@Body() dto: SubscribeDto, @OrgId() orgId: string, @CurrentUser() user: JwtPayload) {
    return successResponse(await this.subscriptionService.subscribe(orgId, dto.planId, user.sub), 'Subscription activated');
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel organization subscription' })
  async cancel(@Body('reason') reason: string, @OrgId() orgId: string, @CurrentUser() user: JwtPayload) {
    return successResponse(await this.subscriptionService.cancelSubscription(orgId, reason, user.sub));
  }
}
