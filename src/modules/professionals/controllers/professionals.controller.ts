import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProfessionalsService } from '../services/professionals.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { successResponse } from '../../../common/utils/response.util';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionGuard } from '../../../common/guards/permissions.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { Audit } from '../../../common/decorators/audit.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SYSTEM_ROLES } from '../../../common/constants/roles.constants';
import { FEATURE_KEYS, ACTION_KEYS } from '../../../common/constants/permissions.constants';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';

class CreateProfessionalProfileDto {
  @ApiProperty({ example: 'advocate' }) @IsString() type: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licenseNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barCouncil?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) specializations?: string[];
  @ApiPropertyOptional() @IsOptional() experienceYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() hourlyRate?: number;
}

@ApiTags('Professionals')
@ApiBearerAuth('accessToken')
  @UseGuards(PermissionGuard)
@Controller({ path: 'professionals', version: '1' })
export class ProfessionalsController {
  constructor(private professionalsService: ProfessionalsService) {}

  @Post('profile')
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.PROFESSIONALS })
  @ApiOperation({ summary: 'Create or update professional profile' })
  async createOrUpdate(@CurrentUser() user: JwtPayload, @Body() dto: CreateProfessionalProfileDto) {
    const result = await this.professionalsService.createOrUpdate(user.sub, dto);
    return successResponse(result, 'Professional profile saved');
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get own professional profile' })
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    const result = await this.professionalsService.findByUserId(user.sub);
    return successResponse(result);
  }

  @Get('marketplace')
  @Permission(FEATURE_KEYS.PROFESSIONALS_VIEW)
  @ApiOperation({ summary: 'Browse verified professionals marketplace' })
  async marketplace(
    @Query('type') type?: string,
    @Query('specialization') specialization?: string,
    @Query('city') city?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const result = await this.professionalsService.findAll({ type, specialization, city, page: +page, limit: +limit });
    return successResponse(result);
  }

  @Get(':id')
  @Permission(FEATURE_KEYS.PROFESSIONALS_VIEW)
  @ApiOperation({ summary: 'Get professional profile by ID' })
  async findOne(@Param('id') id: string) {
    const result = await this.professionalsService.findById(id);
    return successResponse(result);
  }

  @Patch(':id/verify')
  @Roles(SYSTEM_ROLES.SUPER_ADMIN)
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.PROFESSIONALS })
  @ApiOperation({ summary: 'Verify a professional (super admin only)' })
  async verify(@Param('id') id: string) {
    const result = await this.professionalsService.verify(id);
    return successResponse(result, 'Professional verified');
  }
}
