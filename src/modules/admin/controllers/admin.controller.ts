import { Controller, Get, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../database/prisma.service';
import { successResponse } from '../../../common/utils/response.util';
import { buildPaginatedResponse, getPaginationParams } from '../../../common/utils/pagination.util';
import { Audit } from '../../../common/decorators/audit.decorator';
import { RequiresPlanAccess } from '../../../common/decorators/plan-access.decorator';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';
import { ACTION_KEYS } from '../../../common/constants/action-keys.constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PlanAccessGuard } from '../../../common/guards/plan-access.guard';

@ApiTags('Admin')
@ApiBearerAuth('accessToken')
@UseGuards(JwtAuthGuard, PlanAccessGuard)
@RequiresPlanAccess({ moduleKey: MODULE_KEYS.ADMIN_DASHBOARD })
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private prisma: PrismaService) { }

  @Get('stats')
  @ApiOperation({ summary: 'Get platform-wide statistics' })
  async getStats() {
    const [users, organizations, cases, professionals, revenue] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.organization.count({ where: { deletedAt: null } }),
      this.prisma.case.count({ where: { deletedAt: null } }),
      this.prisma.professional.count(),
      this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'completed' } }),
    ]);
    return successResponse({
      users,
      organizations,
      cases,
      professionals: professionals,
      totalRevenue: revenue._sum.amount || 0,
    });
  }

  @Get('users')
  @ApiOperation({ summary: 'List all platform users' })
  async listUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const { skip, take } = getPaginationParams({ page: +page, limit: +limit });
    const where: any = { deletedAt: null };
    if (search)
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
      ];
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);
    return successResponse(buildPaginatedResponse(items, total, { page: +page, limit: +limit }));
  }

  @Patch('users/:id/status')
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.ADMIN })
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  async toggleUserStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    const user = await this.prisma.user.update({ where: { id }, data: { isActive } });
    return successResponse(user, `User ${isActive ? 'activated' : 'deactivated'}`);
  }

  @Patch('users/:id/approval')
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.ADMIN })
  @ApiOperation({ summary: 'Update user approval status' })
  async updateApprovalStatus(
    @Param('id') id: string,
    @Body('status') status: 'approved' | 'rejected' | 'pending' | 'suspended',
    @Body('note') note?: string,
  ) {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        approvalStatus: status,
        approvalNote: note,
        // Auto-activate if approved
        isActive: status === 'approved' ? true : undefined,
      },
    });
    return successResponse(user, `User application ${status}`);
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List all organizations' })
  async listOrgs(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    const { skip, take } = getPaginationParams({ page: +page, limit: +limit });
    const where: any = { deletedAt: null };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take,
        include: {
          _count: { select: { members: true, cases: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count({ where }),
    ]);
    return successResponse(buildPaginatedResponse(items, total, { page: +page, limit: +limit }));
  }

  @Get('professionals/pending')
  @ApiOperation({ summary: 'List professionals pending verification' })
  async getPendingVerifications(@Query('page') page = 1, @Query('limit') limit = 20) {
    const { skip, take } = getPaginationParams({ page: +page, limit: +limit });
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { userType: 'advocate', approvalStatus: 'pending' },
        skip,
        take,
        include: { professional: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.count({ where: { userType: 'advocate', approvalStatus: 'pending' } }),
    ]);
    return successResponse(buildPaginatedResponse(items, total, { page: +page, limit: +limit }));
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue breakdown by year' })
  async getRevenue(@Query('year') year = new Date().getFullYear()) {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'completed',
        createdAt: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) },
      },
      select: { amount: true, createdAt: true, currency: true },
    });
    const monthly: { month: string, amount: number }[] = [];
    payments.forEach((p) => {
      const month = new Date(p.createdAt).toISOString().slice(0, 7);
      monthly.push({ month, amount: Number(p.amount) })
    });
    return successResponse({
      year,
      monthly,
      total: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    });
  }
}
