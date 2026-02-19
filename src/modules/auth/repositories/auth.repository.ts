import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthRepository {
  constructor(private prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include: { security: true } });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: { security: true } });
  }

  async createUser(data: Prisma.UserCreateInput & { passwordHash: string }) {
    const { passwordHash, ...userData } = data;
    return this.prisma.user.create({
      data: {
        ...userData,
        security: { create: { passwordHash } },
      },
      include: { security: true },
    });
  }

  async updateSecurity(userId: string, data: Prisma.UserSecurityUpdateInput) {
    return this.prisma.userSecurity.update({ where: { userId }, data });
  }

  async incrementLoginAttempts(userId: string) {
    return this.prisma.userSecurity.update({
      where: { userId },
      data: { loginAttempts: { increment: 1 } },
    });
  }

  async resetLoginAttempts(userId: string) {
    return this.prisma.userSecurity.update({
      where: { userId },
      data: { loginAttempts: 0, lockedUntil: null },
    });
  }

  async updateLastLogin(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }

  async findByResetToken(tokenHash: string) {
    return this.prisma.userSecurity.findFirst({
      where: { passwordResetToken: tokenHash, passwordResetExpiry: { gt: new Date() } },
      include: { user: true },
    });
  }
}
