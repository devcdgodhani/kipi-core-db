import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribeDto {
  @ApiProperty({ example: 'plan-id-123' })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({ example: 'monthly', enum: ['monthly', 'yearly'] })
  @IsString()
  @IsNotEmpty()
  billingInterval: 'monthly' | 'yearly';
}

export class CancelSubscriptionDto {
  @ApiProperty({ example: 'Too expensive' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
