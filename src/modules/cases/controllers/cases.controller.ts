import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaseType, CaseStatus } from '@prisma/client';
import { CasesService } from '../services/cases.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrgId } from '../../../common/decorators/org-id.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { successResponse } from '../../../common/utils/response.util';
import { Permission } from '../../../common/decorators/permission.decorator';
import { Audit } from '../../../common/decorators/audit.decorator';
import { PermissionGuard } from '../../../common/guards/permissions.guard';
import { FEATURE_KEYS, ACTION_KEYS } from '../../../common/constants/permissions.constants';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';

class CreateCaseDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty({ enum: CaseType }) @IsEnum(CaseType) type: CaseType;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jurisdiction?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() hearingDate?: Date;
}

class UpdateStatusDto {
  @ApiProperty({ enum: CaseStatus }) @IsEnum(CaseStatus) status: CaseStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

class AssignProfessionalDto {
  @ApiProperty() @IsString() professionalId: string;
  @ApiProperty({ example: 'lead' }) @IsString() role: string;
}

@ApiTags('Cases')
@ApiBearerAuth('accessToken')
@UseGuards(PermissionGuard)
@Controller({ path: 'cases', version: '1' })
export class CasesController {
  constructor(private casesService: CasesService) {}

  @Post()
  @Permission(FEATURE_KEYS.CASES_CREATE)
  @Audit({ action: 'create', module: MODULE_KEYS.CASES })
  @ApiOperation({ summary: 'Create a new case' })
  async create(@Body() dto: CreateCaseDto, @CurrentUser() user: JwtPayload, @OrgId() orgId: string) {
    return successResponse(await this.casesService.create(orgId, user.sub, dto), 'Case created');
  }

  @Get()
  @Permission(FEATURE_KEYS.CASES_READ)
  @ApiOperation({ summary: 'List cases (filter by org, status, type, search)' })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1, @Query('limit') limit = 20,
    @Query('status') status?: string, @Query('type') type?: string,
    @Query('search') search?: string, @Query('clientId') clientId?: string,
  ) {
    return successResponse(await this.casesService.findAll({ page: +page, limit: +limit, orgId, status, type, search, clientId }));
  }

  @Get(':id')
  @Permission(FEATURE_KEYS.CASES_READ)
  @ApiOperation({ summary: 'Get case details' })
  async findOne(@Param('id') id: string) {
    return successResponse(await this.casesService.findById(id));
  }

  @Patch(':id')
  @Permission(FEATURE_KEYS.CASES_UPDATE)
  @Audit({ action: 'update', module: MODULE_KEYS.CASES })
  @ApiOperation({ summary: 'Update case' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateCaseDto>, @CurrentUser() user: JwtPayload, @OrgId() orgId: string) {
    return successResponse(await this.casesService.update(id, user.sub, orgId, dto), 'Case updated');
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @Permission(FEATURE_KEYS.CASES_UPDATE)
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.CASES })
  @ApiOperation({ summary: 'Update case status' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: JwtPayload, @OrgId() orgId: string) {
    return successResponse(await this.casesService.updateStatus(id, dto.status, user.sub, orgId, dto.note));
  }

  @Post(':id/assignments')
  @Permission(FEATURE_KEYS.CASES_ASSIGN)
  @Audit({ action: ACTION_KEYS.ASSIGN, module: MODULE_KEYS.CASES })
  @ApiOperation({ summary: 'Assign a professional to a case' })
  async assign(@Param('id') caseId: string, @Body() dto: AssignProfessionalDto, @CurrentUser() user: JwtPayload, @OrgId() orgId: string) {
    return successResponse(await this.casesService.assignProfessional(caseId, dto.professionalId, dto.role, user.sub, orgId), 'Professional assigned');
  }

  @Get(':id/documents')
  @Permission(FEATURE_KEYS.CASES_READ)
  @ApiOperation({ summary: 'Get case documents' })
  async getDocuments(@Param('id') caseId: string) {
    return successResponse(await this.casesService.getDocuments(caseId));
  }

  @Post(':id/documents')
  @Permission(FEATURE_KEYS.CASES_UPDATE)
  @Audit({ action: ACTION_KEYS.UPLOAD, module: MODULE_KEYS.CASES })
  @ApiOperation({ summary: 'Add document to case' })
  async addDocument(@Param('id') caseId: string, @Body() dto: { name: string; fileUrl: string; fileType: string }, @CurrentUser() user: JwtPayload, @OrgId() orgId: string) {
    return successResponse(await this.casesService.addDocument(caseId, { ...dto, uploadedBy: user.sub }, orgId), 'Document added');
  }
}
