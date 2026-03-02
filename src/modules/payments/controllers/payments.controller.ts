import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
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
import { Audit } from '../../../common/decorators/audit.decorator';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';
import { ACTION_KEYS } from '../../../common/constants/action-keys.constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

class CreateOrderDto {
  @ApiProperty() @IsString() planId: string;
  @ApiProperty({ enum: ['monthly', 'yearly'] }) @IsString() billingInterval: 'monthly' | 'yearly';
}

class VerifyPaymentDto {
  @ApiProperty() @IsString() razorpayOrderId: string;
  @ApiProperty() @IsString() razorpayPaymentId: string;
  @ApiProperty() @IsString() razorpaySignature: string;
}

@ApiTags('Payments')
@ApiBearerAuth('accessToken')
  @UseGuards()
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('orders')
  @Audit({ action: ACTION_KEYS.CREATE, module: MODULE_KEYS.BILLING })
  @ApiOperation({ summary: 'Create a Razorpay payment order' })
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return successResponse(
      await this.paymentsService.createOrder(dto.planId, user.sub, dto.billingInterval),
      'Order created',
    );
  }

  @Post('verify')
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.BILLING })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify payment and activate subscription' })
  async verify(
    @Body() dto: VerifyPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return successResponse(
      await this.paymentsService.verifyAndActivate(
        user.sub,
        dto.razorpayOrderId,
        dto.razorpayPaymentId,
        dto.razorpaySignature,
      ),
    );
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
  @ApiOperation({ summary: 'Get payment history for organization' })
  async history(@CurrentUser() user: JwtPayload, @Query('page') page = 1, @Query('limit') limit = 20) {
    return successResponse(await this.paymentsService.getHistory(user.sub, +page, +limit));
  }
}
