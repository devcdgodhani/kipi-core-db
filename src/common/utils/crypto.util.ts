import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { SYSTEM_CONSTANTS } from '../constants/system.constants';

/**
 * Hash a password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SYSTEM_CONSTANTS.BCRYPT_ROUNDS);
}

/**
 * Compare a plain password against a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(bytes = 64): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate N backup codes (8-char alphanumeric)
 */
export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase(),
  );
}

/**
 * Hash a token for storage (SHA-256)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a random OTP code
 */
export function generateOtp(length = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}
