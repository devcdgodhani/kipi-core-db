import { Injectable, Logger } from '@nestjs/common';
import { AuditRepository } from '../repositories/audit.repository';
import { buildPaginatedResponse, getPaginationParams } from '../../../common/utils/pagination.util';

interface LogAuditInput {
  userId?: string;
  orgId?: string;
  module: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private auditRepository: AuditRepository) {}

  async log(data: LogAuditInput): Promise<void> {
    try {
      await this.auditRepository.create(data);
    } catch (error) {
      this.logger.error('Failed to write audit log', error);
    }
  }

  async findAll(params: {
    page?: number; limit?: number;
    userId?: string; orgId?: string;
    module?: string; action?: string;
    from?: Date; to?: Date;
  }) {
    const dto = { page: params.page || 1, limit: params.limit || 20 };
    const { skip, take } = getPaginationParams(dto);
    const { logs, total } = await this.auditRepository.findAll({ skip, take, ...params });
    return buildPaginatedResponse(logs, total, dto);
  }
}
