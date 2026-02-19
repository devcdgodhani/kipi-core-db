import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SYSTEM_ROLES } from '../../../common/constants/roles.constants';
import { successResponse } from '../../../common/utils/response.util';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionGuard } from '../../../common/guards/permissions.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { Audit } from '../../../common/decorators/audit.decorator';
import { FEATURE_KEYS, ACTION_KEYS } from '../../../common/constants/permissions.constants';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';

class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatar?: string;
}

@ApiTags('Users')
@ApiBearerAuth('accessToken')
  @UseGuards(PermissionGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private usersService: UsersService) { }

  @Get('profile')
  @Permission(FEATURE_KEYS.TEAM_VIEW)
  @ApiOperation({ summary: 'Get own profile' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    const profile = await this.usersService.findById(user.sub);
    return successResponse(profile, 'Profile retrieved');
  }

  @Patch('profile')
  @Permission(FEATURE_KEYS.TEAM_UPDATE)
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.TEAM })
  @ApiOperation({ summary: 'Update own profile' })
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    const updated = await this.usersService.update(user.sub, dto);
    return successResponse(updated, 'Profile updated');
  }

  @Get()
  @Roles(SYSTEM_ROLES.SUPER_ADMIN)
  @Permission(FEATURE_KEYS.TEAM_VIEW)
  @ApiOperation({ summary: 'List all users (super admin only)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    const result = await this.usersService.findAll(+page, +limit, search);
    return successResponse(result);
  }

  @Get(':id')
  @Roles(SYSTEM_ROLES.SUPER_ADMIN)
  @Permission(FEATURE_KEYS.TEAM_VIEW)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return successResponse(user);
  }

  @Delete(':id')
  @Roles(SYSTEM_ROLES.SUPER_ADMIN)
  @Permission(FEATURE_KEYS.TEAM_DELETE)
  @Audit({ action: ACTION_KEYS.DELETE, module: MODULE_KEYS.TEAM })
  @ApiOperation({ summary: 'Deactivate a user (admin only)' })
  async deactivate(@Param('id') id: string) {
    await this.usersService.deactivate(id);
    return successResponse(null, 'User deactivated');
  }
}
