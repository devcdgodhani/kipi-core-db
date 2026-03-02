import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { successResponse } from '../../../common/utils/response.util';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Audit } from '../../../common/decorators/audit.decorator';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';
import { ACTION_KEYS } from '../../../common/constants/action-keys.constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatar?: string;
}

@ApiTags('Users')
@ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get own profile' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    const profile = await this.usersService.findById(user.sub);
    return successResponse(profile, 'Profile retrieved');
  }

  @Patch('profile')
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.TEAM })
  @ApiOperation({ summary: 'Update own profile' })
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    const updated = await this.usersService.update(user.sub, dto);
    return successResponse(updated, 'Profile updated');
  }

  @Get()
  @ApiOperation({ summary: 'List all users (super admin only)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'userType', required: false })
  @ApiQuery({ name: 'approvalStatus', required: false })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('userType') userType?: string,
    @Query('approvalStatus') approvalStatus?: string,
  ) {
    const result = await this.usersService.findAll(+page, +limit, search, userType, approvalStatus);
    return successResponse(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return successResponse(user);
  }

  @Delete(':id')
  @Audit({ action: ACTION_KEYS.DELETE, module: MODULE_KEYS.TEAM })
  @ApiOperation({ summary: 'Deactivate a user (admin only)' })
  async deactivate(@Param('id') id: string) {
    await this.usersService.deactivate(id);
    return successResponse(null, 'User deactivated');
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: 'List pending professional/law firm registrations' })
  async getPendingApprovals(@Query('page') page = 1, @Query('limit') limit = 20) {
    const result = await this.usersService.getPendingApprovals(+page, +limit);
    return successResponse(result);
  }

  @Patch(':id/approve')
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.USERS })
  @ApiOperation({ summary: 'Approve a user registration' })
  async approve(@Param('id') id: string, @CurrentUser('sub') adminId: string) {
    const result = await this.usersService.updateApprovalStatus(id, 'approved' as any, adminId);
    return successResponse(result, 'User account approved');
  }

  @Patch(':id/reject')
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.USERS })
  @ApiOperation({ summary: 'Reject a user registration' })
  async reject(
    @Param('id') id: string,
    @Body('note') note: string,
    @CurrentUser('sub') adminId: string,
  ) {
    const result = await this.usersService.updateApprovalStatus(id, 'rejected' as any, adminId, note);
    return successResponse(result, 'User account rejected');
  }

  @Patch(':id/suspend')
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.USERS })
  @ApiOperation({ summary: 'Suspend a user account' })
  async suspend(
    @Param('id') id: string,
    @Body('note') note: string,
    @CurrentUser('sub') adminId: string,
  ) {
    const result = await this.usersService.updateApprovalStatus(id, 'suspended' as any, adminId, note);
    return successResponse(result, 'User account suspended');
  }

  @Patch(':id/unsuspend')
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.USERS })
  @ApiOperation({ summary: 'Unsuspend a user account' })
  async unsuspend(@Param('id') id: string, @CurrentUser('sub') adminId: string) {
    const result = await this.usersService.updateApprovalStatus(id, 'approved' as any, adminId);
    return successResponse(result, 'User account reactivated');
  }
}
