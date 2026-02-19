import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { NotificationType } from '@prisma/client';
import { buildPaginatedResponse, getPaginationParams } from '../../../common/utils/pagination.util';

interface SendNotificationInput {
  userId: string; type: NotificationType; title: string; body: string;
  entityType?: string; entityId?: string; metadata?: any;
}

@Injectable()
export class NotificationsService {
  constructor(private notificationsRepository: NotificationsRepository) {}

  async send(input: SendNotificationInput) {
    return this.notificationsRepository.create(input);
  }

  async sendBulk(userIds: string[], input: Omit<SendNotificationInput, 'userId'>) {
    const items = userIds.map((userId) => ({ userId, ...input }));
    return this.notificationsRepository.createMany(items);
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams({ page, limit });
    const { items, total } = await this.notificationsRepository.findByUser(userId, skip, take);
    return buildPaginatedResponse(items, total, { page, limit });
  }

  async countUnread(userId: string) {
    return this.notificationsRepository.countUnread(userId);
  }

  async markRead(id: string, userId: string) {
    return this.notificationsRepository.markRead(id, userId);
  }

  async markAllRead(userId: string) {
    return this.notificationsRepository.markAllRead(userId);
  }

  async clearAll(userId: string) {
    return this.notificationsRepository.deleteAll(userId);
  }
}
