import {
  Controller, Get, Patch, Delete, Param, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { successResponse } from '../../../common/utils/response.util';
import { PermissionGuard } from '../../../common/guards/permissions.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { FEATURE_KEYS, ACTION_KEYS } from '../../../common/constants/permissions.constants';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';
import { Audit } from '../../../common/decorators/audit.decorator';

@ApiTags('Notifications')
@ApiBearerAuth('accessToken')
  @UseGuards(PermissionGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @Permission(FEATURE_KEYS.NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Get my notifications' })
  async findAll(@CurrentUser() user: JwtPayload, @Query('page') page = 1, @Query('limit') limit = 20) {
    const result = await this.notificationsService.findByUser(user.sub, +page, +limit);
    return successResponse(result);
  }

  @Get('unread-count')
  @Permission(FEATURE_KEYS.NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.notificationsService.countUnread(user.sub);
    return successResponse({ count }, 'Unread count retrieved');
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @Permission(FEATURE_KEYS.NOTIFICATIONS_MANAGE)
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.NOTIFICATIONS })
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.notificationsService.markRead(id, user.sub);
    return successResponse(null, 'Notification marked as read');
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @Permission(FEATURE_KEYS.NOTIFICATIONS_MANAGE)
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.NOTIFICATIONS })
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: JwtPayload) {
    await this.notificationsService.markAllRead(user.sub);
    return successResponse(null, 'All notifications marked as read');
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  @Permission(FEATURE_KEYS.NOTIFICATIONS_MANAGE)
  @Audit({ action: ACTION_KEYS.DELETE, module: MODULE_KEYS.NOTIFICATIONS })
  @ApiOperation({ summary: 'Clear all notifications' })
  async clearAll(@CurrentUser() user: JwtPayload) {
    await this.notificationsService.clearAll(user.sub);
    return successResponse(null, 'Notifications cleared');
  }
}
