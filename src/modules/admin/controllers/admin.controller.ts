import {
  Controller, Get, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../database/prisma.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SYSTEM_ROLES } from '../../../common/constants/roles.constants';
import { successResponse } from '../../../common/utils/response.util';
import { buildPaginatedResponse, getPaginationParams } from '../../../common/utils/pagination.util';

@ApiTags('Admin')
@ApiBearerAuth('accessToken')
@Roles(SYSTEM_ROLES.SUPER_ADMIN)
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
    return successResponse({ users, organizations, cases, professionals, totalRevenue: revenue._sum.amount || 0 });
  }

  @Get('users')
  @ApiOperation({ summary: 'List all platform users' })
  async listUsers(@Query('page') page = 1, @Query('limit') limit = 20, @Query('search') search?: string, @Query('isActive') isActive?: string) {
    const { skip, take } = getPaginationParams({ page: +page, limit: +limit });
    const where: any = { deletedAt: null };
    if (search) where.OR = [{ email: { contains: search, mode: 'insensitive' } }, { firstName: { contains: search, mode: 'insensitive' } }];
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);
    return successResponse(buildPaginatedResponse(items, total, { page: +page, limit: +limit }));
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  async toggleUserStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    const user = await this.prisma.user.update({ where: { id }, data: { isActive } });
    return successResponse(user, `User ${isActive ? 'activated' : 'deactivated'}`);
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List all organizations' })
  async listOrgs(@Query('page') page = 1, @Query('limit') limit = 20, @Query('search') search?: string) {
    const { skip, take } = getPaginationParams({ page: +page, limit: +limit });
    const where: any = { deletedAt: null };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where, skip, take,
        include: { _count: { select: { members: true, cases: true } }, subscription: { include: { plan: true } } },
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
      this.prisma.professional.findMany({
        where: { verificationStatus: 'pending' }, skip, take,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.professional.count({ where: { verificationStatus: 'pending' } }),
    ]);
    return successResponse(buildPaginatedResponse(items, total, { page: +page, limit: +limit }));
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue breakdown by year' })
  async getRevenue(@Query('year') year = new Date().getFullYear()) {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'completed', createdAt: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } },
      select: { amount: true, createdAt: true, currency: true },
    });
    const monthly: Record<string, number> = {};
    payments.forEach((p) => {
      const month = new Date(p.createdAt).toISOString().slice(0, 7);
      monthly[month] = (monthly[month] || 0) + Number(p.amount);
    });
    return successResponse({ year, monthly, total: payments.reduce((sum, p) => sum + Number(p.amount), 0) });
  }
}
