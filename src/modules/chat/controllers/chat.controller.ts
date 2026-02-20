import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../database/prisma.service';
import { successResponse } from '../../../common/utils/response.util';
import { buildPaginatedResponse, getPaginationParams } from '../../../common/utils/pagination.util';
import { PermissionGuard } from '../../../common/guards/permissions.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { FEATURE_KEYS } from '../../../common/constants/permissions.constants';
import { ChatService } from '../services/chat.service';

@ApiTags('Chat')
@ApiBearerAuth('accessToken')
  @UseGuards(PermissionGuard)
@Controller({ path: 'chat', version: '1' })
export class ChatController {
  constructor(private chatService: ChatService) { }

  @Get('messages')
  @Permission(FEATURE_KEYS.CHAT_READ)
  @ApiOperation({ summary: 'Get chat message history for a case (REST fallback)' })
  async getMessages(
    @Query('caseId') caseId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const result = await this.chatService.getMessages(caseId, +page, +limit);
    return successResponse(result);
  }
}
