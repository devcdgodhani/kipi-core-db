import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthRepository {
  constructor(private prisma: PrismaService) {}

  private get db(): any {
    return this.prisma;
  }

  async findUserByEmail(email: string) {
    return this.db.user.findUnique({ where: { email }, include: { security: true } });
  }

  async findUserById(id: string) {
    return this.db.user.findUnique({ where: { id }, include: { security: true } });
  }

  async createUser(data: Prisma.UserCreateInput & { passwordHash: string }) {
    const { passwordHash, ...userData } = data;
    return this.db.user.create({
      data: {
        ...userData,
        security: { create: { passwordHash } },
      },
      include: { security: true },
    });
  }

  async updateSecurity(userId: string, data: Prisma.UserSecurityUpdateInput) {
    return this.db.userSecurity.update({ where: { userId }, data });
  }

  async incrementLoginAttempts(userId: string) {
    return this.db.userSecurity.update({
      where: { userId },
      data: { loginAttempts: { increment: 1 } },
    });
  }

  async resetLoginAttempts(userId: string) {
    return this.db.userSecurity.update({
      where: { userId },
      data: { loginAttempts: 0, lockedUntil: null },
    });
  }

  async updateLastLogin(userId: string) {
    return this.db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }

  async markEmailVerified(userId: string) {
    await this.db.user.update({ where: { id: userId }, data: { isVerified: true } });
    await this.db.userSecurity.update({
      where: { userId },
      data: { emailVerifyToken: null, emailVerifyExpiry: null },
    });
  }

  async findByResetToken(tokenHash: string) {
    return this.db.userSecurity.findFirst({
      where: { passwordResetToken: tokenHash, passwordResetExpiry: { gt: new Date() } },
      include: { user: true },
    });
  }

  // ── Session Management ───────────────────────────────────────────────────

  async createSession(data: {
    id?: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: any;
  }) {
    return this.db.userSession.create({ data });
  }

  async findSessionByToken(tokenHash: string) {
    return this.db.userSession.findUnique({
      where: { tokenHash },
      include: { user: { include: { security: true } } },
    });
  }

  async updateSessionActivity(id: string, tokenHash?: string) {
    return this.db.userSession.update({
      where: { id },
      data: {
        lastActiveAt: new Date(),
        ...(tokenHash ? { tokenHash } : {}),
      },
    });
  }

  async deleteSessionByToken(tokenHash: string) {
    return this.db.userSession.delete({ where: { tokenHash } }).catch(() => null);
  }

  async findSessionById(id: string) {
    return this.db.userSession.findUnique({
      where: { id },
    });
  }

  async deleteSessionById(id: string) {
    return this.db.userSession.delete({ where: { id } }).catch(() => null);
  }

  async deleteAllSessionsByUserId(userId: string) {
    return this.db.userSession.deleteMany({ where: { userId } });
  }
}
