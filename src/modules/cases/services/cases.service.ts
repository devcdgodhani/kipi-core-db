import { Injectable, NotFoundException } from '@nestjs/common';
import { CasesRepository } from '../repositories/cases.repository';
import { AuditService } from '../../audit/services/audit.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { CaseStatus, CaseType } from '@prisma/client';
import { buildPaginatedResponse, getPaginationParams } from '../../../common/utils/pagination.util';

@Injectable()
export class CasesService {
  constructor(
    private repo: CasesRepository,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  async create(orgId: string, clientId: string, dto: any) {
    const caseNumber = await this.repo.getNextCaseNumber(orgId);
    const caseItem = await this.repo.create({
      caseNumber, title: dto.title, type: dto.type, description: dto.description,
      priority: dto.priority || 'medium',
      courtName: dto.courtName || dto.courtDetails, 
      courtCaseNumber: dto.courtCaseNumber,
      nextHearingDate: dto.hearingDate, 
      metadata: dto.metadata, status: 'open',
      organization: { connect: { id: orgId } }, client: { connect: { id: clientId } },
    });
    await this.auditService.log({ userId: clientId, orgId, module: 'cases', action: 'create', entityType: 'case', entityId: caseItem.id, newData: { caseNumber, title: dto.title } });
    return caseItem;
  }

  async findAll(params: any) {
    const { skip, take } = getPaginationParams({ page: params.page || 1, limit: params.limit || 20 });
    const { items, total } = await this.repo.findAll({ skip, take, ...params });
    return buildPaginatedResponse(items, total, { page: params.page || 1, limit: params.limit || 20 });
  }

  async findById(id: string) {
    const caseItem = await this.repo.findById(id);
    if (!caseItem) throw new NotFoundException('Case not found');
    return caseItem;
  }

  async update(id: string, userId: string, orgId: string, data: any) {
    await this.findById(id);
    const updated = await this.repo.update(id, data);
    await this.auditService.log({ userId, orgId, module: 'cases', action: 'update', entityType: 'case', entityId: id, newData: data });
    return updated;
  }

  async updateStatus(id: string, status: CaseStatus, userId: string, orgId: string, note?: string) {
    const existing = await this.findById(id);
    await this.repo.update(id, { status, closedAt: status === 'closed' ? new Date() : null });
    await this.repo.addUpdate({ case: { connect: { id } }, content: note || `Status changed to ${status}`, type: 'status_change', updatedBy: { connect: { id: userId } }, metadata: { oldStatus: existing.status, newStatus: status } } as any);
    await this.notificationsService.send({ userId: existing.clientId, type: 'case_update', title: 'Case Status Updated', body: `Your case "${existing.title}" status changed to ${status}.`, entityType: 'case', entityId: id });
    await this.auditService.log({ userId, orgId, module: 'cases', action: 'update_status', entityType: 'case', entityId: id, newData: { status } });
    return { message: 'Status updated' };
  }

  async assignProfessional(caseId: string, professionalId: string, role: string, userId: string, orgId: string) {
    await this.findById(caseId);
    const assignment = await this.repo.assignProfessional(caseId, professionalId, role);
    await this.auditService.log({ userId, orgId, module: 'cases', action: 'assign_professional', entityType: 'case', entityId: caseId, newData: { professionalId, role } });
    return assignment;
  }

  async addDocument(caseId: string, data: any, orgId: string) {
    await this.findById(caseId);
    return this.repo.addDocument(caseId, data);
  }

  async getDocuments(caseId: string) {
    await this.findById(caseId);
    return this.repo.getDocuments(caseId);
  }
}
