import {
  Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SecurityService } from '../services/security.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { successResponse } from '../../../common/utils/response.util';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class DisableMfaDto {
  @ApiProperty({ description: 'Current password for confirmation' }) @IsString() password: string;
}

@ApiTags('Security')
@ApiBearerAuth('accessToken')
@Controller({ path: 'security', version: '1' })
export class SecurityController {
  constructor(private securityService: SecurityService) {}

  @Get('mfa/status')
  @ApiOperation({ summary: 'Get MFA status for current user' })
  async getMfaStatus(@CurrentUser() user: JwtPayload) {
    const result = await this.securityService.getMfaStatus(user.sub);
    return successResponse(result);
  }

  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable MFA (requires current password)' })
  async disableMfa(@CurrentUser() user: JwtPayload, @Body() dto: DisableMfaDto) {
    const result = await this.securityService.disableMfa(user.sub, dto.password);
    return successResponse(result);
  }

  @Post('mfa/backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate MFA backup codes' })
  async regenerateBackupCodes(@CurrentUser() user: JwtPayload) {
    const result = await this.securityService.regenerateBackupCodes(user.sub);
    return successResponse(result, 'Backup codes regenerated');
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get active sessions' })
  async getSessions(@CurrentUser() user: JwtPayload) {
    const result = await this.securityService.getSessions(user.sub);
    return successResponse(result);
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(@Param('sessionId') sessionId: string, @CurrentUser() user: JwtPayload) {
    const result = await this.securityService.revokeSession(user.sub, sessionId);
    return successResponse(result);
  }

  @Delete('sessions/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all sessions (sign out everywhere)' })
  async revokeAllSessions(@CurrentUser() user: JwtPayload) {
    const result = await this.securityService.revokeAllSessions(user.sub);
    return successResponse(result);
  }
}
