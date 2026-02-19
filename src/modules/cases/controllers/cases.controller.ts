import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
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
@Controller({ path: 'cases', version: '1' })
export class CasesController {
  constructor(private casesService: CasesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new case' })
  async create(@Body() dto: CreateCaseDto, @CurrentUser() user: JwtPayload, @OrgId() orgId: string) {
    return successResponse(await this.casesService.create(orgId, user.sub, dto), 'Case created');
  }

  @Get()
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
  @ApiOperation({ summary: 'Get case details' })
  async findOne(@Param('id') id: string) {
    return successResponse(await this.casesService.findById(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update case' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateCaseDto>, @CurrentUser() user: JwtPayload, @OrgId() orgId: string) {
    return successResponse(await this.casesService.update(id, user.sub, orgId, dto), 'Case updated');
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update case status' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: JwtPayload, @OrgId() orgId: string) {
    return successResponse(await this.casesService.updateStatus(id, dto.status, user.sub, orgId, dto.note));
  }

  @Post(':id/assignments')
  @ApiOperation({ summary: 'Assign a professional to a case' })
  async assign(@Param('id') caseId: string, @Body() dto: AssignProfessionalDto, @CurrentUser() user: JwtPayload, @OrgId() orgId: string) {
    return successResponse(await this.casesService.assignProfessional(caseId, dto.professionalId, dto.role, user.sub, orgId), 'Professional assigned');
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get case documents' })
  async getDocuments(@Param('id') caseId: string) {
    return successResponse(await this.casesService.getDocuments(caseId));
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Add document to case' })
  async addDocument(@Param('id') caseId: string, @Body() dto: { name: string; fileUrl: string; fileType: string }, @CurrentUser() user: JwtPayload, @OrgId() orgId: string) {
    return successResponse(await this.casesService.addDocument(caseId, { ...dto, uploadedBy: user.sub }, orgId), 'Document added');
  }
}
