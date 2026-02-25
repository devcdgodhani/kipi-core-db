import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SecurityRepository {
  constructor(private prisma: PrismaService) {}

  private get db(): any {
    return this.prisma;
  }

  async getUserSecurity(userId: string) {
    return this.db.userSecurity.findUnique({ where: { userId } });
  }

  async updateSecurity(userId: string, data: any) {
    return this.db.userSecurity.update({ where: { userId }, data });
  }

  async findSessionsByUserId(userId: string) {
    return this.db.userSession.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  async deleteSession(sessionId: string, userId: string) {
    return this.db.userSession.deleteMany({
      where: { id: sessionId, userId },
    });
  }

  async deleteAllSessions(userId: string) {
    return this.db.userSession.deleteMany({
      where: { userId },
    });
  }
}
