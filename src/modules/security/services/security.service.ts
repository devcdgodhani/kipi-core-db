import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RedisService } from '../../../database/redis.service';
import { AuditService } from '../../audit/services/audit.service';
import { comparePassword, generateBackupCodes, hashToken } from '../../../common/utils/crypto.util';
import { SYSTEM_CONSTANTS } from '../../../common/constants/system.constants';

@Injectable()
export class SecurityService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private auditService: AuditService,
  ) {}

  async getMfaStatus(userId: string) {
    const security = await this.prisma.userSecurity.findUnique({ where: { userId } });
    return {
      mfaEnabled: security?.mfaEnabled || false,
      backupCodesCount: security?.mfaBackupCodes?.length || 0,
    };
  }

  async disableMfa(userId: string, password: string) {
    const security = await this.prisma.userSecurity.findUnique({ where: { userId } });
    if (!security) throw new BadRequestException('Security record not found');
    const isValid = await comparePassword(password, security.passwordHash);
    if (!isValid) throw new BadRequestException('Incorrect password');
    if (!security.mfaEnabled) throw new BadRequestException('MFA is not enabled');

    await this.prisma.userSecurity.update({
      where: { userId },
      data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: [] },
    });
    await this.auditService.log({ userId, module: 'security', action: 'mfa_disabled', entityType: 'user', entityId: userId });
    return { message: 'MFA disabled successfully' };
  }

  async regenerateBackupCodes(userId: string) {
    const security = await this.prisma.userSecurity.findUnique({ where: { userId } });
    if (!security?.mfaEnabled) throw new BadRequestException('MFA is not enabled');

    const newCodes = generateBackupCodes(SYSTEM_CONSTANTS.BACKUP_CODE_COUNT);
    const hashedCodes = newCodes.map((code) => hashToken(code));
    await this.prisma.userSecurity.update({ where: { userId }, data: { mfaBackupCodes: hashedCodes } });
    await this.auditService.log({ userId, module: 'security', action: 'backup_codes_regenerated', entityType: 'user', entityId: userId });
    return { backupCodes: newCodes };
  }

  async getSessions(userId: string) {
    // In a real implementation this would query an active sessions table
    const security = await this.prisma.userSecurity.findUnique({ where: { userId } });
    return {
      sessions: security?.refreshTokenHash ? [{ id: 'current', active: true, lastSeen: new Date() }] : [],
    };
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.userSecurity.update({ where: { userId }, data: { refreshTokenHash: null } });
    await this.redisService.delPattern(`jl:permissions:${userId}:*`);
    return { message: 'Session revoked' };
  }

  async revokeAllSessions(userId: string) {
    await this.prisma.userSecurity.update({ where: { userId }, data: { refreshTokenHash: null } });
    await this.redisService.delPattern(`jl:permissions:${userId}:*`);
    await this.auditService.log({ userId, module: 'security', action: 'all_sessions_revoked', entityType: 'user', entityId: userId });
    return { message: 'All sessions revoked. Please log in again.' };
  }
}
