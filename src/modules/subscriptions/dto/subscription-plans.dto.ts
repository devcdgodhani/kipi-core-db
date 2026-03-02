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
import { UserType } from '@prisma/client';

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

  @ApiProperty({ enum: UserType })
  @IsEnum(UserType)
  targetUserType: UserType;

  @ApiProperty({ example: 999.0 })
  @IsNumber()
  @Min(0)
  monthlyPrice: number;

  @ApiProperty({ example: 9999.0 })
  @IsNumber()
  @Min(0)
  yearlyPrice: number;

  @ApiPropertyOptional({ example: 799.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyOfferPrice?: number;

  @ApiPropertyOptional({ example: 7999.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  yearlyOfferPrice?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyDiscount?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  yearlyDiscount?: number;

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

  @ApiPropertyOptional({ type: [String], description: 'Array of Feature IDs' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  featureIds?: string[];
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

  @ApiPropertyOptional({ enum: UserType })
  @IsEnum(UserType)
  @IsOptional()
  targetUserType?: UserType;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyPrice?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  yearlyPrice?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyOfferPrice?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  yearlyOfferPrice?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyDiscount?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  yearlyDiscount?: number;

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

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  featureIds?: string[];
}

