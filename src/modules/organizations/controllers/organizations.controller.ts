import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationsService } from '../services/organizations.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrgId } from '../../../common/decorators/org-id.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { successResponse } from '../../../common/utils/response.util';
import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateOrgDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
}

class InviteMemberDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
}

@ApiTags('Organizations')
@ApiBearerAuth('accessToken')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  async create(@Body() dto: CreateOrgDto, @CurrentUser() user: JwtPayload) {
    const result = await this.orgsService.create(dto, user.sub);
    return successResponse(result, 'Organization created');
  }

  @Get('my')
  @ApiOperation({ summary: 'Get organizations I belong to' })
  async myOrgs(@CurrentUser() user: JwtPayload) {
    const result = await this.orgsService.findByUser(user.sub);
    return successResponse(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details' })
  async findOne(@Param('id') id: string) {
    const result = await this.orgsService.findById(id);
    return successResponse(result);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateOrgDto>, @CurrentUser() user: JwtPayload) {
    const result = await this.orgsService.update(id, dto, user.sub);
    return successResponse(result, 'Organization updated');
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get organization members' })
  async getMembers(@Param('id') id: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    const result = await this.orgsService.getMembers(id, +page, +limit);
    return successResponse(result);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a member to organization' })
  async invite(@Param('id') id: string, @Body() dto: InviteMemberDto, @CurrentUser() user: JwtPayload) {
    const result = await this.orgsService.invite(id, dto.email, dto.role, user.sub);
    return successResponse(result, 'Invitation sent');
  }

  @Post('accept-invite/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an organization invite' })
  async acceptInvite(@Param('token') token: string, @CurrentUser() user: JwtPayload) {
    const result = await this.orgsService.acceptInvite(token, user.sub);
    return successResponse(result, 'Invite accepted');
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from organization' })
  async removeMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() actor: JwtPayload) {
    const result = await this.orgsService.removeMember(id, userId, actor.sub);
    return successResponse(result, 'Member removed');
  }
}
