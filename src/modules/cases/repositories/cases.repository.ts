import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, CaseStatus, CaseType } from '@prisma/client';

@Injectable()
export class CasesRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.CaseCreateInput) {
    return this.prisma.case.create({
      data, include: { assignments: { include: { user: { include: { professional: true } } } } },
    });
  }

  async findById(id: string) {
    return this.prisma.case.findUnique({
      where: { id, deletedAt: null },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
        organization: true,
        assignments: { include: { user: { include: { professional: true } } } },
        updates: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
  }

  async findAll(params: { skip?: number; take?: number; orgId?: string; clientId?: string; status?: CaseStatus; type?: CaseType; search?: string }) {
    const where: Prisma.CaseWhereInput = { deletedAt: null };
    if (params.orgId) where.orgId = params.orgId;
    if (params.clientId) where.clientId = params.clientId;
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;
    if (params.search) where.OR = [{ caseNumber: { contains: params.search, mode: 'insensitive' } }, { title: { contains: params.search, mode: 'insensitive' } }];

    const [items, total] = await Promise.all([
      this.prisma.case.findMany({
        where, skip: params.skip, take: params.take,
        include: { client: { select: { id: true, firstName: true, lastName: true, email: true } }, assignments: { include: { user: { select: { id: true, firstName: true, lastName: true, professional: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.case.count({ where }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.CaseUpdateInput) {
    return this.prisma.case.update({ where: { id }, data });
  }

  async addUpdate(data: Prisma.CaseUpdateCreateInput) {
    return this.prisma.caseUpdate.create({ data });
  }

  async softDelete(id: string) {
    return this.prisma.case.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async assignProfessional(caseId: string, userId: string, role: string) {
    return this.prisma.caseAssignment.upsert({
      where: { caseId_userId_role: { caseId, userId, role } },
      create: { caseId, userId, role },
      update: { role },
    });
  }

  async getNextCaseNumber(orgId: string): Promise<string> {
    const count = await this.prisma.case.count({ where: { orgId } });
    return `JL-${orgId.slice(0, 4).toUpperCase()}-${String(count + 1).padStart(5, '0')}`;
  }

  async addDocument(caseId: string, data: any) {
    return this.prisma.caseDocument.create({ data: { caseId, ...data } });
  }

  async getDocuments(caseId: string) {
    return this.prisma.caseDocument.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } });
  }
}
