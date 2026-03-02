import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
  Length,
  IsArray,
  IsInt,
  Min,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { Type } from 'class-transformer';

export class BaseRegisterDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'SecurePass@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: UserType, default: 'client' })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;
}

export class RegisterClientDto extends BaseRegisterDto {
  @ApiPropertyOptional({ example: ['Civil Litigation', 'Family Law'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];
}

export class RegisterProfessionalDto extends BaseRegisterDto {
  @ApiPropertyOptional({ example: 'BAR-123456' })
  @IsOptional()
  @IsString()
  barRegistration?: string;

  @ApiProperty({ example: ['Criminal Law'] })
  @IsArray()
  @IsString({ each: true })
  specializations: string[];

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  experienceYears: number;

  @ApiPropertyOptional({ example: 'Experienced criminal defense professional.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ example: ['High Court'] })
  @IsArray()
  @IsString({ each: true })
  practiceAreas: string[];

  @ApiPropertyOptional({ example: ['English', 'Hindi'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({ example: 'New Delhi' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  hourlyRate?: number;
}

export class RegisterLawFirmDto extends BaseRegisterDto {
  @ApiProperty({ example: 'Justice Partners LLP' })
  @IsString()
  @MinLength(3)
  firmName: string;

  @ApiPropertyOptional({ example: 'REG-7890' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 2010 })
  @IsOptional()
  @IsInt()
  @Min(1800)
  establishedYear?: number;

  @ApiPropertyOptional({ example: 'https://justicepartners.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ example: ['Corporate Law', 'Litigation'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiPropertyOptional({ example: { street: 'Main St', city: 'Delhi' } })
  @IsOptional()
  address?: any;

  @ApiPropertyOptional({ example: 'Leading legal firm in the region.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'contact@firm.com' })
  @IsOptional()
  @IsEmail()
  firmEmail?: string;

  @ApiPropertyOptional({ example: '+919876543211' })
  @IsOptional()
  @IsString()
  firmPhone?: string;
}

export class RegisterDto extends BaseRegisterDto { }

export class LoginDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  @MinLength(1)
  password: string;
}

export class VerifyEmailOtpDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '6-digit OTP sent to email', example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}

export class ResendOtpDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;
}

export class MfaVerifyDto {
  @ApiProperty({ description: '6-digit TOTP code from authenticator app', example: '123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(8)
  token: string;

  @ApiProperty({ description: 'Temporary token from login response' })
  @IsString()
  mfaTempToken: string;
}

export class MfaBackupCodeDto {
  @ApiProperty({ description: '8-char backup code', example: 'A1B2C3D4' })
  @IsString()
  @MinLength(8)
  @MaxLength(8)
  backupCode: string;

  @ApiProperty({ description: 'Temporary token from login response' })
  @IsString()
  mfaTempToken: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;
}

export class VerifyForgotPasswordOtpDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '6-digit OTP sent via email', example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Short-lived reset session token returned by verify-otp step' })
  @IsString()
  resetToken: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  newPassword: string;
}
