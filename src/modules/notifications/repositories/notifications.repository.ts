import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationType } from '@prisma/client';

interface CreateNotificationInput {
  userId: string; type: NotificationType; title: string; body: string;
  entityType?: string; entityId?: string; metadata?: any;
}

@Injectable()
export class NotificationsRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateNotificationInput) {
    return this.prisma.notification.create({ data });
  }

  async createMany(items: CreateNotificationInput[]) {
    return this.prisma.notification.createMany({ data: items });
  }

  async findByUser(userId: string, skip: number, take: number) {
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { items, total };
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async deleteAll(userId: string) {
    return this.prisma.notification.deleteMany({ where: { userId } });
  }
}
