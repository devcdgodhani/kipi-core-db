import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChatRepository } from '../repositories/chat.repository';
import { AuditService } from '../../audit/services/audit.service';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';
import { ACTION_KEYS } from '../../../common/constants/permissions.constants';
import { buildPaginatedResponse } from '../../../common/utils/pagination.util';

@Injectable()
export class ChatService {
  constructor(
    private repository: ChatRepository,
    private auditService: AuditService,
  ) {}

  async sendMessage(userId: string, orgId: string, data: { caseId: string; content: string }) {
    const message = await this.repository.create({
      caseId: data.caseId,
      senderId: userId,
      content: data.content,
    });

    await this.auditService.log({
      userId,
      orgId,
      module: MODULE_KEYS.CHAT,
      action: ACTION_KEYS.SEND,
      entityType: 'case_message',
      entityId: message.id,
      metadata: { caseId: data.caseId },
    });

    return message;
  }

  async getMessages(caseId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.repository.findByCaseId(caseId, skip, limit),
      this.repository.countByCaseId(caseId),
    ]);

    return buildPaginatedResponse(items.reverse(), total, { page, limit });
  }

  async markAsRead(userId: string, orgId: string, messageId: string) {
    const message = await this.repository.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');

    if (message.readBy.includes(userId)) return message;

    const updated = await this.repository.markAsRead(messageId, userId);

    await this.auditService.log({
      userId,
      orgId,
      module: MODULE_KEYS.CHAT,
      action: ACTION_KEYS.UPDATE,
      entityType: 'case_message',
      entityId: messageId,
      metadata: { action: 'read', caseId: message.caseId },
    });

    return updated;
  }

  async deleteMessage(userId: string, orgId: string, messageId: string) {
    const message = await this.repository.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Not authorized to delete this message');

    const deleted = await this.repository.softDelete(messageId);

    await this.auditService.log({
      userId,
      orgId,
      module: MODULE_KEYS.CHAT,
      action: ACTION_KEYS.DELETE,
      entityType: 'case_message',
      entityId: messageId,
      metadata: { caseId: message.caseId },
    });

    return deleted;
  }
}
