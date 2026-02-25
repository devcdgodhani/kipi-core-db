import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { UAParser } from 'ua-parser-js';
import { AuthRepository } from '../repositories/auth.repository';
import {
  RegisterDto,
  LoginDto,
  MfaVerifyDto,
  MfaBackupCodeDto,
  VerifyEmailOtpDto,
  ResendOtpDto,
  ForgotPasswordDto,
  VerifyForgotPasswordOtpDto,
  ResetPasswordDto,
} from '../dto/auth.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { RedisService } from '../../../database/redis.service';
import { AuditService } from '../../audit/services/audit.service';
import { MailService } from '../../mail/services/mail.service';
import {
  hashPassword,
  comparePassword,
  generateSecureToken,
  generateBackupCodes,
  hashToken,
  generateOtp,
} from '../../../common/utils/crypto.util';
import { SYSTEM_ROLES } from '../../../common/constants/roles.constants';
import { SYSTEM_CONSTANTS } from '../../../common/constants/system.constants';

// Redis key helpers
const OTP_VERIFY_KEY = (email: string) => `jl:otp:verify:${email}`;
const OTP_PWD_KEY = (email: string) => `jl:otp:pwd:${email}`;
const OTP_RESEND_KEY = (email: string) => `jl:otp:resend:${email}`;
const RESET_TOKEN_KEY = (token: string) => `jl:reset:session:${token}`;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private authRepository: AuthRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private auditService: AuditService,
    private mailService: MailService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.authRepository.findUserByEmail(dto.email.toLowerCase().trim());
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

    // Send email verification OTP automatically
    await this._sendVerificationOtp(user.email, user.firstName);

    await this.auditService.log({
      userId: user.id,
      module: 'auth',
      action: 'register',
      entityType: 'user',
      entityId: user.id,
    });

    this.logger.log(`New user registered: ${user.email}`);
    return {
      message: 'Registration successful. Please verify your email.',
      email: user.email,
      user: this.sanitizeUser(user),
    };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.authRepository.findUserByEmail(dto.email.toLowerCase());
    if (!user) throw new BadRequestException('Invalid credentials');
    if (!user.isActive)
      throw new ForbiddenException('Account is deactivated. Please contact support.');

    const security = user.security;
    if (!security) throw new UnauthorizedException('Account setup incomplete');

    // Account lockout check
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
        throw new ForbiddenException(
          `Too many failed attempts. Account locked for ${SYSTEM_CONSTANTS.LOCK_DURATION_MINUTES} minutes.`,
        );
      }
      throw new BadRequestException('Invalid credentials');
    }

    await this.authRepository.resetLoginAttempts(user.id);

    // ── Email not yet verified ──────────────────────────────────────────────
    if (!user.isVerified) {
      await this._sendVerificationOtp(user.email, user.firstName, 'login');
      await this.auditService.log({
        userId: user.id,
        module: 'auth',
        action: 'login_email_verify_required',
        entityType: 'user',
        entityId: user.id,
        ipAddress,
      });
      return {
        emailVerificationRequired: true,
        mfaRequired: false,
        email: user.email,
        user: null,
        accessToken: null,
        refreshToken: null,
      };
    }

    // ── MFA enabled ─────────────────────────────────────────────────────────
    if (security.mfaEnabled) {
      const mfaTemp = generateSecureToken(32);
      await this.redisService.set(`jl:mfa:temp:${mfaTemp}`, { userId: user.id }, 300);
      await this.auditService.log({
        userId: user.id,
        module: 'auth',
        action: 'login_mfa_required',
        entityType: 'user',
        entityId: user.id,
        ipAddress,
      });
      return {
        emailVerificationRequired: false,
        mfaRequired: true,
        mfaTempToken: mfaTemp,
        user: null,
        accessToken: null,
        refreshToken: null,
      };
    }

    // ── Full login success ───────────────────────────────────────────────────
    await this.authRepository.updateLastLogin(user.id);
    const tokens = await this._generateTokensWithSession(user, ipAddress, userAgent);
    await this.auditService.log({
      userId: user.id,
      module: 'auth',
      action: 'login',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
      userAgent,
    });
    this.logger.log(`User logged in: ${user.email}`);
    return {
      emailVerificationRequired: false,
      mfaRequired: false,
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ─── Verify Email OTP ────────────────────────────────────────────────────────

  async verifyEmailOtp(dto: VerifyEmailOtpDto) {
    const stored = await this.redisService.get<{ otp: string; userId: string }>(
      OTP_VERIFY_KEY(dto.email.toLowerCase()),
    );

    if (!stored) {
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }
    if (stored.otp !== dto.otp) {
      throw new BadRequestException('Invalid OTP. Please try again.');
    }

    const user = await this.authRepository.findUserById(stored.userId);
    if (!user) throw new UnauthorizedException('User not found.');

    await this.authRepository.markEmailVerified(user.id);
    await this.redisService.del(OTP_VERIFY_KEY(dto.email.toLowerCase()));

    // Send welcome email
    await this.mailService.sendWelcomeEmail(user.email, user.firstName, user.userType);

    const tokens = await this.generateTokens({ ...user, isVerified: true });
    await this.auditService.log({
      userId: user.id,
      module: 'auth',
      action: 'email_verified',
      entityType: 'user',
      entityId: user.id,
    });

    this.logger.log(`Email verified: ${user.email}`);
    return { user: this.sanitizeUser({ ...user, isVerified: true }), ...tokens };
  }

  // ─── Resend OTP ───────────────────────────────────────────────────────────

  async resendOtp(dto: ResendOtpDto) {
    const email = dto.email.toLowerCase();
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) throw new BadRequestException('No account found with this email.');
    if (user.isVerified) throw new BadRequestException('Email already verified. Please log in.');

    // Rate-limit: max OTP_MAX_RESENDS times per OTP_RESEND_WINDOW_MINUTES
    const resendKey = OTP_RESEND_KEY(email);
    const resendCount = (await this.redisService.get<number>(resendKey)) ?? 0;

    if (resendCount >= SYSTEM_CONSTANTS.OTP_MAX_RESENDS) {
      throw new HttpException(
        `Maximum resend limit reached. Please wait ${SYSTEM_CONSTANTS.OTP_RESEND_WINDOW_MINUTES} minutes before trying again.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this._sendVerificationOtp(email, user.firstName);

    // Increment resend counter with sliding window
    await this.redisService.set(
      resendKey,
      resendCount + 1,
      SYSTEM_CONSTANTS.OTP_RESEND_WINDOW_MINUTES * 60,
    );

    return { message: 'OTP resent successfully. Please check your email.' };
  }

  // ─── MFA Verify ───────────────────────────────────────────────────────────

  async verifyMfa(dto: MfaVerifyDto, ipAddress?: string, userAgent?: string) {
    const cached = await this.redisService.get<{ userId: string }>(
      `jl:mfa:temp:${dto.mfaTempToken}`,
    );
    if (!cached) throw new BadRequestException('MFA session expired. Please login again.');

    const user = await this.authRepository.findUserById(cached.userId);
    if (!user?.security?.mfaSecret) throw new BadRequestException('MFA not configured');

    const isValid = speakeasy.totp.verify({
      secret: user.security.mfaSecret,
      encoding: 'base32',
      token: dto.token,
      window: SYSTEM_CONSTANTS.MFA_TOKEN_WINDOW,
    });

    if (!isValid) throw new BadRequestException('Invalid MFA code');

    await this.redisService.del(`jl:mfa:temp:${dto.mfaTempToken}`);
    await this.authRepository.updateLastLogin(user.id);
    const tokens = await this._generateTokensWithSession(user, ipAddress, userAgent, true);
    await this.auditService.log({
      userId: user.id,
      module: 'auth',
      action: 'mfa_verified',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
      userAgent,
    });
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ─── MFA Backup Code ──────────────────────────────────────────────────────

  async verifyMfaBackupCode(dto: MfaBackupCodeDto, ipAddress?: string, userAgent?: string) {
    const cached = await this.redisService.get<{ userId: string }>(
      `jl:mfa:temp:${dto.mfaTempToken}`,
    );
    if (!cached) throw new BadRequestException('MFA session expired. Please login again.');

    const user = await this.authRepository.findUserById(cached.userId);
    const security = user?.security;
    if (!security) throw new BadRequestException('Invalid session');

    const codeHash = hashToken(dto.backupCode.toUpperCase());
    const codeIndex = security.mfaBackupCodes.indexOf(codeHash);
    if (codeIndex === -1) throw new BadRequestException('Invalid backup code');

    const updatedCodes = [...security.mfaBackupCodes];
    updatedCodes.splice(codeIndex, 1);
    await this.authRepository.updateSecurity(user.id, { mfaBackupCodes: updatedCodes });
    await this.redisService.del(`jl:mfa:temp:${dto.mfaTempToken}`);
    await this.authRepository.updateLastLogin(user.id);

    const tokens = await this._generateTokensWithSession(user, ipAddress, userAgent, true);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ─── Forgot Password (send OTP) ───────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase();
    const user = await this.authRepository.findUserByEmail(email);

    // Always return success to avoid email enumeration
    if (!user) {
      this.logger.warn(`Forgot password for unknown email: ${email}`);
      return { message: 'If an account exists, a reset code has been sent to your email.' };
    }

    const otp = generateOtp(6);
    const expirySeconds = SYSTEM_CONSTANTS.FORGOT_PWD_OTP_EXPIRES_MINUTES * 60;
    await this.redisService.set(OTP_PWD_KEY(email), { otp, userId: user.id }, expirySeconds);

    await this.mailService.sendForgotPasswordOtp(user.email, user.firstName, otp);
    await this.auditService.log({
      userId: user.id,
      module: 'auth',
      action: 'forgot_password_otp_sent',
      entityType: 'user',
      entityId: user.id,
    });

    return { message: 'If an account exists, a reset code has been sent to your email.' };
  }

  // ─── Verify Forgot Password OTP ──────────────────────────────────────────

  async verifyForgotPasswordOtp(dto: VerifyForgotPasswordOtpDto) {
    const email = dto.email.toLowerCase();
    const stored = await this.redisService.get<{ otp: string; userId: string }>(OTP_PWD_KEY(email));

    if (!stored || stored.otp !== dto.otp) {
      throw new UnauthorizedException('Invalid or expired OTP. Please request a new one.');
    }

    // OTP valid — issue a short-lived reset session token
    const resetToken = generateSecureToken(32);
    const expirySeconds = SYSTEM_CONSTANTS.RESET_SESSION_EXPIRES_MINUTES * 60;
    await this.redisService.set(
      RESET_TOKEN_KEY(resetToken),
      { userId: stored.userId },
      expirySeconds,
    );
    await this.redisService.del(OTP_PWD_KEY(email));

    return {
      message: 'OTP verified. Please set your new password.',
      resetToken,
    };
  }

  // ─── Reset Password ───────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const session = await this.redisService.get<{ userId: string }>(
      RESET_TOKEN_KEY(dto.resetToken),
    );
    if (!session) {
      throw new UnauthorizedException(
        'Reset session expired. Please restart the password reset process.',
      );
    }

    const user = await this.authRepository.findUserById(session.userId);
    if (!user) throw new UnauthorizedException('User not found.');

    const passwordHash = await hashPassword(dto.newPassword);
    await this.authRepository.updateSecurity(user.id, {
      passwordHash,
      lastPasswordChangedAt: new Date(),
    });

    // Revoke all sessions on password reset for security
    await this.authRepository.deleteAllSessionsByUserId(user.id);
    await this.redisService.del(RESET_TOKEN_KEY(dto.resetToken));
    // Invalidate any active permissions cache
    await this.redisService.delPattern(`jl:permissions:${user.id}:*`);

    await this.mailService.sendPasswordChangedConfirmation(user.email, user.firstName);
    await this.auditService.log({
      userId: user.id,
      module: 'auth',
      action: 'password_reset',
      entityType: 'user',
      entityId: user.id,
    });

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  // ─── Refresh Tokens ───────────────────────────────────────────────────────

  async refreshTokens(userId: string, refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    let session = await this.authRepository.findSessionByToken(tokenHash);

    // If not found by current token, check if it was recently rotated (grace period)
    if (!session) {
      const graceSessionId = await this.redisService.get<string>(`jl:auth:grace:${tokenHash}`);
      if (graceSessionId) {
        session = await this.authRepository.findSessionById(graceSessionId);
      }
    }

    if (!session || dayjs().isAfter(dayjs(session.expiresAt))) {
      if (session) await this.authRepository.deleteSessionById(session.id);
      throw new UnauthorizedException('Session expired or invalid');
    }

    const tokens = await this.generateTokens(session.user, true, session.id);
    const newTokenHash = hashToken(tokens.refreshToken);

    await this.authRepository.updateSessionActivity(session.id, newTokenHash);

    // Set grace period for the OLD token to prevent race conditions (30 seconds)
    await this.redisService.set(`jl:auth:grace:${tokenHash}`, session.id, 30);

    await this.auditService.log({
      userId: session.userId,
      module: 'auth',
      action: 'token_refresh',
      entityType: 'user',
      entityId: session.userId,
    });
    return tokens;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken?: string, sid?: string) {
    if (sid) {
      await this.authRepository.deleteSessionById(sid);
    } else if (refreshToken) {
      await this.authRepository.deleteSessionByToken(hashToken(refreshToken));
    }
    await this.redisService.delPattern(`jl:permissions:${userId}:*`);
    await this.auditService.log({
      userId,
      module: 'auth',
      action: 'logout',
      entityType: 'user',
      entityId: userId,
    });
    this.logger.log(`User logged out: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  // ─── MFA Setup / Enable ───────────────────────────────────────────────────

  async setupMfa(userId: string, appName: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const secret = speakeasy.generateSecret({ name: `${appName}:${user.email}`, length: 32 });
    await this.redisService.set(`jl:mfa:setup:${userId}`, secret.base32, 600);
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    return {
      secret: secret.base32,
      qrCode,
      message: 'Scan QR code with your authenticator app and verify the code',
    };
  }

  async enableMfa(userId: string, token: string) {
    const secret = await this.redisService.get<string>(`jl:mfa:setup:${userId}`);
    if (!secret) throw new BadRequestException('MFA setup session expired. Please restart.');

    const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
    if (!isValid) throw new BadRequestException('Invalid TOTP code. Please try again.');

    const backupCodes = generateBackupCodes(SYSTEM_CONSTANTS.BACKUP_CODE_COUNT);
    const hashedCodes = backupCodes.map((code) => hashToken(code));
    await this.authRepository.updateSecurity(userId, {
      mfaEnabled: true,
      mfaSecret: secret,
      mfaBackupCodes: hashedCodes,
    });
    await this.redisService.del(`jl:mfa:setup:${userId}`);
    return { message: 'MFA enabled successfully', backupCodes };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async _sendVerificationOtp(
    email: string,
    firstName: string,
    context: 'registration' | 'login' = 'registration',
  ) {
    const otp = generateOtp(6);
    const expirySeconds = SYSTEM_CONSTANTS.OTP_EXPIRES_MINUTES * 60;
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) return;

    await this.redisService.set(OTP_VERIFY_KEY(email), { otp, userId: user.id }, expirySeconds);

    if (context === 'login') {
      await this.mailService.sendLoginOtp(email, firstName, otp);
    } else {
      await this.mailService.sendEmailVerificationOtp(email, firstName, otp);
    }
  }

  private async _generateTokensWithSession(
    user: any,
    ipAddress?: string,
    userAgent?: string,
    mfaVerified = false,
  ) {
    const sid = uuidv4();
    const tokens = await this.generateTokens(user, mfaVerified, sid);
    const tokenHash = hashToken(tokens.refreshToken);

    const parser = new UAParser(userAgent);
    const uaResult = parser.getResult();

    await this.authRepository.createSession({
      id: sid,
      userId: user.id,
      tokenHash,
      ipAddress,
      userAgent,
      deviceInfo: {
        browser: uaResult.browser.name,
        browserVersion: uaResult.browser.version,
        os: uaResult.os.name,
        osVersion: uaResult.os.version,
        device: uaResult.device.model || 'Desktop',
        deviceType: uaResult.device.type || 'desktop',
      },
      expiresAt: dayjs().add(7, 'day').toDate(), // Match refresh token duration
    });

    return tokens;
  }

  private async generateTokens(user: any, mfaVerified = false, sid?: string) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.userType === 'super_admin' ? SYSTEM_ROLES.SUPER_ADMIN : user.userType,
      userType: user.userType,
      mfaVerified,
      sid,
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

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { security, ...sanitized } = user;
    return sanitized;
  }
}
