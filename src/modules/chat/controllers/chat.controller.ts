import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../database/prisma.service';
import { successResponse } from '../../../common/utils/response.util';
import { buildPaginatedResponse, getPaginationParams } from '../../../common/utils/pagination.util';

@ApiTags('Chat')
@ApiBearerAuth('accessToken')
@Controller({ path: 'chat', version: '1' })
export class ChatController {
  constructor(private prisma: PrismaService) {}

  @Get('messages')
  @ApiOperation({ summary: 'Get chat message history for a case (REST fallback)' })
  async getMessages(
    @Query('caseId') caseId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const { skip, take } = getPaginationParams({ page: +page, limit: +limit });
    const [items, total] = await Promise.all([
      this.prisma.caseMessage.findMany({
        where: { caseId }, skip, take, orderBy: { createdAt: 'desc' },
        include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      }),
      this.prisma.caseMessage.count({ where: { caseId } }),
    ]);
    return successResponse(buildPaginatedResponse(items.reverse(), total, { page: +page, limit: +limit }));
  }
}
