import {
  Controller, Get, Post, Body, Query, HttpCode, HttpStatus, Headers, RawBodyRequest, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentsService } from '../services/payments.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrgId } from '../../../common/decorators/org-id.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Public } from '../../../common/decorators/public.decorator';
import { successResponse } from '../../../common/utils/response.util';
import { PermissionGuard } from '../../../common/guards/permissions.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { Audit } from '../../../common/decorators/audit.decorator';
import { FEATURE_KEYS, ACTION_KEYS } from '../../../common/constants/permissions.constants';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';

class CreateOrderDto {
  @ApiProperty() @IsString() planId: string;
}

class VerifyPaymentDto {
  @ApiProperty() @IsString() razorpayOrderId: string;
  @ApiProperty() @IsString() razorpayPaymentId: string;
  @ApiProperty() @IsString() razorpaySignature: string;
}

@ApiTags('Payments')
@ApiBearerAuth('accessToken')
  @UseGuards(PermissionGuard)
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('orders')
  @Permission(FEATURE_KEYS.BILLING_MANAGE)
  @Audit({ action: ACTION_KEYS.CREATE, module: MODULE_KEYS.BILLING })
  @ApiOperation({ summary: 'Create a Razorpay payment order' })
  async createOrder(@Body() dto: CreateOrderDto, @OrgId() orgId: string, @CurrentUser() user: JwtPayload) {
    return successResponse(await this.paymentsService.createOrder(orgId, dto.planId, user.sub), 'Order created');
  }

  @Post('verify')
  @Permission(FEATURE_KEYS.BILLING_MANAGE)
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.BILLING })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify payment and activate subscription' })
  async verify(@Body() dto: VerifyPaymentDto, @OrgId() orgId: string, @CurrentUser() user: JwtPayload) {
    return successResponse(await this.paymentsService.verifyAndActivate(orgId, user.sub, dto.razorpayOrderId, dto.razorpayPaymentId, dto.razorpaySignature));
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook (public)' })
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers('x-razorpay-signature') sig: string) {
    const rawBody = (req as any).rawBody?.toString() || '';
    return this.paymentsService.handleWebhook(rawBody, sig);
  }

  @Get('history')
  @Permission(FEATURE_KEYS.BILLING_VIEW)
  @ApiOperation({ summary: 'Get payment history for organization' })
  async history(@OrgId() orgId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return successResponse(await this.paymentsService.getHistory(orgId, +page, +limit));
  }
}
