import {
  Controller, Get, Patch, Delete, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { successResponse } from '../../../common/utils/response.util';

@ApiTags('Notifications')
@ApiBearerAuth('accessToken')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  async findAll(@CurrentUser() user: JwtPayload, @Query('page') page = 1, @Query('limit') limit = 20) {
    const result = await this.notificationsService.findByUser(user.sub, +page, +limit);
    return successResponse(result);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.notificationsService.countUnread(user.sub);
    return successResponse({ count }, 'Unread count retrieved');
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.notificationsService.markRead(id, user.sub);
    return successResponse(null, 'Notification marked as read');
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: JwtPayload) {
    await this.notificationsService.markAllRead(user.sub);
    return successResponse(null, 'All notifications marked as read');
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all notifications' })
  async clearAll(@CurrentUser() user: JwtPayload) {
    await this.notificationsService.clearAll(user.sub);
    return successResponse(null, 'Notifications cleared');
  }
}
