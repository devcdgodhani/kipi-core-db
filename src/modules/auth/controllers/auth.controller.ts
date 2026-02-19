import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import {
  RegisterDto,
  LoginDto,
  MfaVerifyDto,
  MfaBackupCodeDto,
} from '../dto/auth.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthGuard } from '@nestjs/passport';
import { successResponse } from '../../../common/utils/response.util';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return successResponse(result, 'Registration successful');
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/password' })
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    const result = await this.authService.login(dto, ip);
    return successResponse(result, result.mfaRequired ? 'MFA verification required' : 'Login successful');
  }

  @Public()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP MFA code after login' })
  async verifyMfa(@Body() dto: MfaVerifyDto, @Ip() ip: string) {
    const result = await this.authService.verifyMfa(dto, ip);
    return successResponse(result, 'MFA verification successful');
  }

  @Public()
  @Post('mfa/backup-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login using MFA backup code' })
  async verifyMfaBackupCode(@Body() dto: MfaBackupCodeDto) {
    const result = await this.authService.verifyMfaBackupCode(dto);
    return successResponse(result, 'Backup code verification successful');
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@CurrentUser() user: JwtPayload & { refreshToken: string }) {
    const tokens = await this.authService.refreshTokens(user.sub, user.refreshToken);
    return successResponse(tokens, 'Tokens refreshed');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(@CurrentUser() user: JwtPayload) {
    const result = await this.authService.logout(user.sub);
    return successResponse(result);
  }

  @Get('mfa/setup')
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: 'Initiate MFA setup – get QR code' })
  async setupMfa(@CurrentUser() user: JwtPayload) {
    const appName = this.configService.get<string>('app.name', 'JusticeLynk');
    const result = await this.authService.setupMfa(user.sub, appName);
    return successResponse(result, 'Scan the QR code with your authenticator app');
  }

  @Post('mfa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: 'Confirm and activate MFA with TOTP token' })
  async enableMfa(@CurrentUser() user: JwtPayload, @Body('token') token: string) {
    const result = await this.authService.enableMfa(user.sub, token);
    return successResponse(result);
  }

  @Get('me')
  @ApiBearerAuth('accessToken')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@CurrentUser() user: JwtPayload) {
    return successResponse(user, 'Current user');
  }
}
