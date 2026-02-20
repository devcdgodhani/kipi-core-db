import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChatRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.CaseMessageUncheckedCreateInput) {
    return this.prisma.caseMessage.create({
      data,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
  }

  async findByCaseId(caseId: string, skip: number, take: number) {
    return this.prisma.caseMessage.findMany({
      where: { caseId, deletedAt: null },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
  }

  async countByCaseId(caseId: string) {
    return this.prisma.caseMessage.count({
      where: { caseId, deletedAt: null },
    });
  }

  async findById(id: string) {
    return this.prisma.caseMessage.findUnique({
      where: { id },
      include: { sender: true },
    });
  }

  async markAsRead(messageId: string, userId: string) {
    return this.prisma.caseMessage.update({
      where: { id: messageId },
      data: {
        readBy: {
          push: userId,
        },
      },
    });
  }

  async softDelete(id: string) {
    return this.prisma.caseMessage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
