import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesPermissionsService } from '../services/roles-permissions.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrgId } from '../../../common/decorators/org-id.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { successResponse } from '../../../common/utils/response.util';
import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateRoleDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

class AssignRoleDto {
  @ApiProperty() @IsUUID() userId: string;
  @ApiProperty() @IsUUID() roleId: string;
}

class GrantPermissionsDto {
  @ApiProperty() @IsUUID() roleId: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) permissions: string[];
}

@ApiTags('Roles & Permissions')
@ApiBearerAuth('accessToken')
@Controller({ path: 'roles', version: '1' })
export class RolesPermissionsController {
  constructor(private rolesService: RolesPermissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create custom role for org' })
  async createRole(@Body() dto: CreateRoleDto, @OrgId() orgId: string, @CurrentUser() user: JwtPayload) {
    const result = await this.rolesService.createRole(dto.name, dto.description, orgId, user.sub);
    return successResponse(result, 'Role created');
  }

  @Get()
  @ApiOperation({ summary: 'List all roles for org' })
  async listRoles(@OrgId() orgId: string) {
    const result = await this.rolesService.listRoles(orgId);
    return successResponse(result);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Get permissions assigned to a role' })
  async getRolePermissions(@Param('id') roleId: string) {
    const result = await this.rolesService.getRolePermissions(roleId);
    return successResponse(result);
  }

  @Post('grant')
  @ApiOperation({ summary: 'Grant module permissions to a role' })
  async grant(@Body() dto: GrantPermissionsDto, @OrgId() orgId: string, @CurrentUser() user: JwtPayload) {
    const result = await this.rolesService.grantPermissions(dto.roleId, dto.permissions, orgId, user.sub);
    return successResponse(result, 'Permissions granted');
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign a role to a user' })
  async assignRole(@Body() dto: AssignRoleDto, @OrgId() orgId: string, @CurrentUser() user: JwtPayload) {
    const result = await this.rolesService.assignRoleToUser(dto.userId, dto.roleId, orgId, user.sub);
    return successResponse(result, 'Role assigned to user');
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get roles assigned to a user within org' })
  async getUserRoles(@Param('userId') userId: string, @OrgId() orgId: string) {
    const result = await this.rolesService.getUserRoles(userId, orgId);
    return successResponse(result);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a custom role' })
  async deleteRole(@Param('id') id: string, @CurrentUser() user: JwtPayload, @OrgId() orgId: string) {
    await this.rolesService.deleteRole(id, orgId, user.sub);
    return successResponse(null, 'Role deleted');
  }
}
