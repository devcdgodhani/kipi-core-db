import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import dayjs from 'dayjs';
import { AuthRepository } from '../repositories/auth.repository';
import { RegisterDto, LoginDto, MfaVerifyDto, MfaBackupCodeDto } from '../dto/auth.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { RedisService } from '../../../database/redis.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  hashPassword,
  comparePassword,
  generateSecureToken,
  generateBackupCodes,
  hashToken,
} from '../../../common/utils/crypto.util';
import { SYSTEM_ROLES } from '../../../common/constants/roles.constants';
import { SYSTEM_CONSTANTS } from '../../../common/constants/system.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private authRepository: AuthRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private auditService: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.authRepository.findUserByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await hashPassword(dto.password);

    const user = await this.authRepository.createUser({
      email: dto.email.toLowerCase().trim(),
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      userType: dto.userType || 'client',
      passwordHash,
    });

    await this.auditService.log({
      userId: user.id, module: 'auth', action: 'register',
      entityType: 'user', entityId: user.id,
    });

    const tokens = await this.generateTokens(user);
    this.logger.log(`New user registered: ${user.email}`);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.authRepository.findUserByEmail(dto.email.toLowerCase());
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new ForbiddenException('Account is deactivated. Please contact support.');

    const security = user.security;
    if (!security) throw new UnauthorizedException('Account setup incomplete');

    if (security.lockedUntil && dayjs().isBefore(dayjs(security.lockedUntil))) {
      const minutesLeft = dayjs(security.lockedUntil).diff(dayjs(), 'minute');
      throw new ForbiddenException(`Account locked. Try again in ${minutesLeft} minute(s).`);
    }

    const isPasswordValid = await comparePassword(dto.password, security.passwordHash);

    if (!isPasswordValid) {
      await this.authRepository.incrementLoginAttempts(user.id);
      if (security.loginAttempts + 1 >= SYSTEM_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
        const lockUntil = dayjs().add(SYSTEM_CONSTANTS.LOCK_DURATION_MINUTES, 'minute').toDate();
        await this.authRepository.updateSecurity(user.id, { lockedUntil: lockUntil });
        throw new ForbiddenException(`Too many failed attempts. Account locked for ${SYSTEM_CONSTANTS.LOCK_DURATION_MINUTES} minutes.`);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.authRepository.resetLoginAttempts(user.id);
    await this.authRepository.updateLastLogin(user.id);

    if (security.mfaEnabled) {
      const mfaTemp = generateSecureToken(32);
      await this.redisService.set(`jl:mfa:temp:${mfaTemp}`, { userId: user.id }, 300);
      await this.auditService.log({ userId: user.id, module: 'auth', action: 'login_mfa_required', entityType: 'user', entityId: user.id, ipAddress });
      return { mfaRequired: true, mfaTempToken: mfaTemp, user: null, accessToken: null, refreshToken: null };
    }

    const tokens = await this.generateTokens(user);
    await this.auditService.log({ userId: user.id, module: 'auth', action: 'login', entityType: 'user', entityId: user.id, ipAddress });
    this.logger.log(`User logged in: ${user.email}`);
    return { mfaRequired: false, user: this.sanitizeUser(user), ...tokens };
  }

  async verifyMfa(dto: MfaVerifyDto, ipAddress?: string) {
    const cached = await this.redisService.get<{ userId: string }>(`jl:mfa:temp:${dto.mfaTempToken}`);
    if (!cached) throw new UnauthorizedException('MFA session expired. Please login again.');

    const user = await this.authRepository.findUserById(cached.userId);
    if (!user?.security?.mfaSecret) throw new UnauthorizedException('MFA not configured');

    const isValid = speakeasy.totp.verify({
      secret: user.security.mfaSecret,
      encoding: 'base32',
      token: dto.token,
      window: SYSTEM_CONSTANTS.MFA_TOKEN_WINDOW,
    });

    if (!isValid) throw new UnauthorizedException('Invalid MFA code');

    await this.redisService.del(`jl:mfa:temp:${dto.mfaTempToken}`);
    const tokens = await this.generateTokens(user, true);
    await this.auditService.log({ userId: user.id, module: 'auth', action: 'mfa_verified', entityType: 'user', entityId: user.id, ipAddress });
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async verifyMfaBackupCode(dto: MfaBackupCodeDto) {
    const cached = await this.redisService.get<{ userId: string }>(`jl:mfa:temp:${dto.mfaTempToken}`);
    if (!cached) throw new UnauthorizedException('MFA session expired. Please login again.');

    const user = await this.authRepository.findUserById(cached.userId);
    const security = user?.security;
    if (!security) throw new UnauthorizedException('Invalid session');

    const codeHash = hashToken(dto.backupCode.toUpperCase());
    const codeIndex = security.mfaBackupCodes.indexOf(codeHash);
    if (codeIndex === -1) throw new UnauthorizedException('Invalid backup code');

    const updatedCodes = [...security.mfaBackupCodes];
    updatedCodes.splice(codeIndex, 1);
    await this.authRepository.updateSecurity(user.id, { mfaBackupCodes: updatedCodes });
    await this.redisService.del(`jl:mfa:temp:${dto.mfaTempToken}`);

    const tokens = await this.generateTokens(user, true);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user?.security?.refreshTokenHash) throw new UnauthorizedException('Access denied');

    const incomingHash = hashToken(refreshToken);
    if (user.security.refreshTokenHash !== incomingHash) throw new UnauthorizedException('Refresh token mismatch');

    const tokens = await this.generateTokens(user);
    await this.auditService.log({ userId: user.id, module: 'auth', action: 'token_refresh', entityType: 'user', entityId: user.id });
    return tokens;
  }

  async logout(userId: string) {
    await this.authRepository.updateSecurity(userId, { refreshTokenHash: null });
    await this.redisService.delPattern(`jl:permissions:${userId}:*`);
    await this.auditService.log({ userId, module: 'auth', action: 'logout', entityType: 'user', entityId: userId });
    return { message: 'Logged out successfully' };
  }

  async setupMfa(userId: string, appName: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const secret = speakeasy.generateSecret({ name: `${appName}:${user.email}`, length: 32 });
    await this.redisService.set(`jl:mfa:setup:${userId}`, secret.base32, 600);
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    return { secret: secret.base32, qrCode, message: 'Scan QR code with your authenticator app and verify the code' };
  }

  async enableMfa(userId: string, token: string) {
    const secret = await this.redisService.get<string>(`jl:mfa:setup:${userId}`);
    if (!secret) throw new BadRequestException('MFA setup session expired. Please restart.');

    const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
    if (!isValid) throw new BadRequestException('Invalid TOTP code. Please try again.');

    const backupCodes = generateBackupCodes(SYSTEM_CONSTANTS.BACKUP_CODE_COUNT);
    const hashedCodes = backupCodes.map((code) => hashToken(code));
    await this.authRepository.updateSecurity(userId, { mfaEnabled: true, mfaSecret: secret, mfaBackupCodes: hashedCodes });
    await this.redisService.del(`jl:mfa:setup:${userId}`);
    return { message: 'MFA enabled successfully', backupCodes };
  }

  private async generateTokens(user: any, mfaVerified = false) {
    const payload: JwtPayload = {
      sub: user.id, email: user.email,
      role: user.userType === 'super_admin' ? SYSTEM_ROLES.SUPER_ADMIN : user.userType,
      userType: user.userType, mfaVerified,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    await this.authRepository.updateSecurity(user.id, { refreshTokenHash: hashToken(refreshToken) });
    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { security, ...sanitized } = user;
    return sanitized;
  }
}
