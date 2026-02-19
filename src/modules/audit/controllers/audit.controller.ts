import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from '../services/audit.service';
import { SYSTEM_ROLES } from '../../../common/constants/roles.constants';
import { OrgId } from '../../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { successResponse } from '../../../common/utils/response.util';
import { PermissionGuard } from '../../../common/guards/permissions.guard';
import { Permission } from '../../../common/decorators/permission.decorator';
import { FEATURE_KEYS } from '../../../common/constants/permissions.constants';

@ApiTags('Audit')
@ApiBearerAuth('accessToken')
  @UseGuards(PermissionGuard)
@Controller({ path: 'audit', version: '1' })
export class AuditController {
  constructor(private auditService: AuditService) { }

  @Get()
  @Permission(FEATURE_KEYS.AUDIT_VIEW)
  @ApiOperation({ summary: 'Get audit logs (super admin sees all, org admin sees org logs)' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const params: any = { page: +page, limit: +limit, module, action };
    if (user.role !== SYSTEM_ROLES.SUPER_ADMIN) params.orgId = orgId;
    if (from) params.from = new Date(from);
    if (to) params.to = new Date(to);
    const result = await this.auditService.findAll(params);
    return successResponse(result);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get current user audit trail' })
  async myLogs(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const result = await this.auditService.findAll({ userId: user.sub, page: +page, limit: +limit });
    return successResponse(result);
  }
}
