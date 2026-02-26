import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingInterval } from '@prisma/client';

export class PlanLimitDto {
  @ApiProperty({ example: 'maxUsers' })
  @IsString()
  key: string;

  @ApiProperty({ example: 10, description: '-1 for unlimited' })
  @IsNumber()
  value: number;
}

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Professional Plan' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Best for small law firms' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ enum: BillingInterval, default: BillingInterval.monthly })
  @IsEnum(BillingInterval)
  billingInterval: BillingInterval;

  @ApiPropertyOptional({ example: 14 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  trialDays?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ type: [PlanLimitDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PlanLimitDto)
  limits?: PlanLimitDto[];

  @ApiPropertyOptional({ type: [String], description: 'Array of Module IDs' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  moduleIds?: string[];
}

export class UpdateSubscriptionPlanDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ enum: BillingInterval })
  @IsEnum(BillingInterval)
  @IsOptional()
  billingInterval?: BillingInterval;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  trialDays?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ type: [PlanLimitDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PlanLimitDto)
  limits?: PlanLimitDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  moduleIds?: string[];
}
