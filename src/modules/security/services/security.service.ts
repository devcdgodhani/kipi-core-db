import { Injectable, BadRequestException } from '@nestjs/common';
import { AppType } from '@prisma/client';
import { RedisService } from '../../../database/redis.service';
import { AuditService } from '../../audit/services/audit.service';
import { comparePassword, generateBackupCodes, hashToken } from '../../../common/utils/crypto.util';
import { SYSTEM_CONSTANTS } from '../../../common/constants/system.constants';
import { SecurityRepository } from '../repositories/security.repository';

@Injectable()
export class SecurityService {
  constructor(
    private securityRepository: SecurityRepository,
    private redisService: RedisService,
    private auditService: AuditService,
  ) {}

  async getMfaStatus(userId: string) {
    const security = await this.securityRepository.getUserSecurity(userId);
    return {
      enabled: security?.mfaEnabled || false,
      backupCodesCount: security?.mfaBackupCodes?.length || 0,
    };
  }

  async disableMfa(userId: string, password: string) {
    const security = await this.securityRepository.getUserSecurity(userId);
    if (!security) throw new BadRequestException('Security record not found');
    const isValid = await comparePassword(password, security.passwordHash);
    if (!isValid) throw new BadRequestException('Incorrect password');
    if (!security.mfaEnabled) throw new BadRequestException('MFA is not enabled');

    await this.securityRepository.updateSecurity(userId, {
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: [],
    });
    await this.auditService.log({
      userId,
      appType: AppType.MAIN_WEB,
      module: 'security',
      action: 'mfa_disabled',
      entityType: 'user',
      entityId: userId,
    });
    return { message: 'MFA disabled successfully' };
  }

  async regenerateBackupCodes(userId: string) {
    const security = await this.securityRepository.getUserSecurity(userId);
    if (!security?.mfaEnabled) throw new BadRequestException('MFA is not enabled');

    const newCodes = generateBackupCodes(SYSTEM_CONSTANTS.BACKUP_CODE_COUNT);
    const hashedCodes = newCodes.map((code) => hashToken(code));
    await this.securityRepository.updateSecurity(userId, { mfaBackupCodes: hashedCodes });
    await this.auditService.log({
      userId,
      appType: AppType.MAIN_WEB,
      module: 'security',
      action: 'backup_codes_regenerated',
      entityType: 'user',
      entityId: userId,
    });
    return { backupCodes: newCodes };
  }

  async getSessions(userId: string) {
    const sessions = await this.securityRepository.findSessionsByUserId(userId);

    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      deviceInfo: s.deviceInfo,
      lastActiveAt: s.lastActiveAt,
      expiresAt: s.expiresAt,
      isCurrent: false,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.securityRepository.deleteSession(sessionId, userId);
    // Invalidate permissions cache to force re-evaluation on next request
    await this.redisService.delPattern(`jl:permissions:${userId}:*`);

    await this.auditService.log({
      userId,
      appType: AppType.MAIN_WEB,
      module: 'security',
      action: 'session_revoked',
      entityType: 'user',
      entityId: userId,
      metadata: { sessionId },
    });

    return { message: 'Session revoked successfully' };
  }

  async revokeAllSessions(userId: string) {
    await this.securityRepository.deleteAllSessions(userId);
    await this.redisService.delPattern(`jl:permissions:${userId}:*`);

    await this.auditService.log({
      userId,
      appType: AppType.MAIN_WEB,
      module: 'security',
      action: 'all_sessions_revoked',
      entityType: 'user',
      entityId: userId,
    });
    return { message: 'All sessions revoked. Please log in again.' };
  }
}
