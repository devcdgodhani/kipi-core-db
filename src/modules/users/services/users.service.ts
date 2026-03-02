import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import {
  PaginationDto,
  buildPaginatedResponse,
  getPaginationParams,
} from '../../../common/utils/pagination.util';

import { AuditService } from '../../audit/services/audit.service';
import { AppType, ApprovalStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private usersRepository: UsersRepository,
    private auditService: AuditService,
  ) { }

  async findById(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(page = 1, limit = 20, search?: string, userType?: string, approvalStatus?: string) {
    const dto: PaginationDto = { page, limit };
    const { skip, take } = getPaginationParams(dto);

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (userType) {
      where.userType = userType;
    }

    if (approvalStatus) {
      where.approvalStatus = approvalStatus;
    }

    const { users, total } = await this.usersRepository.findAll({ skip, take, where });
    return buildPaginatedResponse(users, total, dto);
  }

  async update(
    id: string,
    data: { firstName?: string; lastName?: string; phone?: string; avatar?: string },
  ) {
    await this.findById(id);
    return this.usersRepository.update(id, data);
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.usersRepository.softDelete(id);
  }

  async getPendingApprovals(page = 1, limit = 20) {
    const dto: PaginationDto = { page, limit };
    const { skip, take } = getPaginationParams(dto);
    const where = {
      approvalStatus: ApprovalStatus.pending,
      userType: { in: ['advocate', 'law_firm_admin'] as any },
      deletedAt: null,
    };
    const { users, total } = await this.usersRepository.findAll({ skip, take, where });
    return buildPaginatedResponse(users, total, dto);
  }

  async updateApprovalStatus(
    id: string,
    status: ApprovalStatus,
    adminId: string,
    note?: string,
  ) {
    const user = await this.findById(id);

    // Update status in DB
    const updated = await this.usersRepository.update(id, {
      approvalStatus: status,
      approvalNote: note || null,
    });

    await this.auditService.log({
      userId: adminId,
      appType: AppType.ADMIN_WEB,
      module: 'users',
      action: `account_${status}`,
      entityType: 'user',
      entityId: id,
      newData: { status, note },
    });

    return updated;
  }
}
