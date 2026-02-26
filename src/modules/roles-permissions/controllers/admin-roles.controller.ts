import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesPermissionsService } from '../services/roles-permissions.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { successResponse } from '../../../common/utils/response.util';
import { PermissionGuard } from '../../../common/guards/permissions.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Audit } from '../../../common/decorators/audit.decorator';
import { SYSTEM_ROLES } from '../../../common/constants/roles.constants';
import { FEATURE_KEYS, ACTION_KEYS } from '../../../common/constants/permissions.constants';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';
import { CreateAdminRoleDto, UpdateAdminRoleDto, GrantAdminPermissionsDto } from '../dto/admin-roles.dto';

@ApiTags('Admin Roles')
@ApiBearerAuth('accessToken')
@Roles(SYSTEM_ROLES.SUPER_ADMIN)
@UseGuards(PermissionGuard)
@Controller({ path: 'admin/roles', version: '1' })
export class AdminRolesController {
    constructor(private rolesService: RolesPermissionsService) { }

    @Post()
    @Permission(FEATURE_KEYS.ADMIN_MANAGE)
    @Audit({ action: ACTION_KEYS.CREATE, module: MODULE_KEYS.ADMIN })
    @ApiOperation({ summary: 'Create platform-level/system role' })
    async createRole(
        @Body() dto: CreateAdminRoleDto,
        @CurrentUser() user: JwtPayload,
    ) {
        const result = await this.rolesService.createRole(dto, user.sub);
        return successResponse(result, 'Role created');
    }

    @Get()
    @Permission(FEATURE_KEYS.ADMIN_VIEW)
    @ApiOperation({ summary: 'List all platform-level roles' })
    async listRoles() {
        // Passing null orgId to list platform roles
        const result = await this.rolesService.listRoles(null);
        return successResponse(result);
    }

    @Patch(':id')
    @Permission(FEATURE_KEYS.ADMIN_MANAGE)
    @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.ADMIN })
    @ApiOperation({ summary: 'Update platform role' })
    async updateRole(
        @Param('id') id: string,
        @Body() dto: UpdateAdminRoleDto,
        @CurrentUser() user: JwtPayload,
    ) {
        const result = await this.rolesService.updateRole(id, dto, user.sub);
        return successResponse(result, 'Role updated');
    }

    @Get(':id/permissions')
    @Permission(FEATURE_KEYS.ADMIN_VIEW)
    @ApiOperation({ summary: 'Get permissions for platform role' })
    async getPermissions(@Param('id') id: string) {
        const result = await this.rolesService.getRolePermissions(id);
        return successResponse(result);
    }

    @Post('grant')
    @Permission(FEATURE_KEYS.ADMIN_MANAGE)
    @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.ADMIN })
    @ApiOperation({ summary: 'Grant permissions to platform role' })
    async grantPermissions(
        @Body() dto: GrantAdminPermissionsDto,
        @CurrentUser() user: JwtPayload,
    ) {
        const result = await this.rolesService.updateRolePermissions(dto.roleId, dto.permissions, user.sub);
        return successResponse(result, 'Permissions updated');
    }

    @Get('modules')
    @Permission(FEATURE_KEYS.ADMIN_VIEW)
    @ApiOperation({ summary: 'Get all system modules and features' })
    async getModules() {
        const result = await this.rolesService.getModules();
        return successResponse(result);
    }

    @Get('screens')
    @Permission(FEATURE_KEYS.ADMIN_VIEW)
    @ApiOperation({ summary: 'Get all system screens' })
    async getScreens() {
        const result = await this.rolesService.getScreens();
        return successResponse(result);
    }

    @Delete(':id')
    @Permission(FEATURE_KEYS.ADMIN_MANAGE)
    @Audit({ action: ACTION_KEYS.DELETE, module: MODULE_KEYS.ADMIN })
    @ApiOperation({ summary: 'Delete platform role' })
    async deleteRole(
        @Param('id') id: string,
        @CurrentUser() user: JwtPayload,
    ) {
        await this.rolesService.deleteRole(id, null, user.sub);
        return successResponse(null, 'Role deleted');
    }
}
