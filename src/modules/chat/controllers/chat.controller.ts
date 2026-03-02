import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { successResponse } from '../../../common/utils/response.util';
import { ChatService } from '../services/chat.service';
import { PlanAccessGuard } from '../../../common/guards/plan-access.guard';
import { RequiresPlanAccess } from '../../../common/decorators/plan-access.decorator';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';

@ApiTags('Chat')
@ApiBearerAuth('accessToken')
@UseGuards(PlanAccessGuard)
@RequiresPlanAccess({ moduleKey: MODULE_KEYS.CHAT })
@Controller({ path: 'chat', version: '1' })
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('messages')
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
