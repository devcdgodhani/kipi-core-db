import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

interface LogAuditInput {
  userId?: string; orgId?: string; module: string; action: string;
  entityType?: string; entityId?: string; oldData?: any; newData?: any;
  ipAddress?: string; userAgent?: string; metadata?: any;
}

@Injectable()
export class AuditRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: LogAuditInput) {
    return this.prisma.auditLog.create({ data });
  }

  async findAll(params: {
    skip?: number; take?: number;
    userId?: string; orgId?: string;
    module?: string; action?: string;
    from?: Date; to?: Date;
  }) {
    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.orgId) where.orgId = params.orgId;
    if (params.module) where.module = params.module;
    if (params.action) where.action = params.action;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip: params.skip, take: params.take, where,
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { logs, total };
  }
}
