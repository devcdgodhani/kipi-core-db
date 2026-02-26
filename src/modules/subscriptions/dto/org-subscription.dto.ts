import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribeDto {
  @ApiProperty({ example: 'plan-id-123' })
  @IsString()
  @IsNotEmpty()
  planId: string;
}

export class CancelSubscriptionDto {
  @ApiProperty({ example: 'Too expensive' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
