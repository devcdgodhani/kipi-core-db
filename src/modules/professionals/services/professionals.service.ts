import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfessionalsRepository } from '../repositories/professionals.repository';
import { buildPaginatedResponse, getPaginationParams } from '../../../common/utils/pagination.util';

@Injectable()
export class ProfessionalsService {
  constructor(private professionalsRepository: ProfessionalsRepository) {}

  async createOrUpdate(userId: string, data: any) {
    return this.professionalsRepository.upsert(userId, data);
  }

  async findByUserId(userId: string) {
    const prof = await this.professionalsRepository.findByUserId(userId);
    if (!prof) throw new NotFoundException('Professional profile not found');
    return prof;
  }

  async findById(id: string) {
    const prof = await this.professionalsRepository.findById(id);
    if (!prof) throw new NotFoundException('Professional not found');
    return prof;
  }

  async findAll(params: { type?: string; specialization?: string; city?: string; page?: number; limit?: number }) {
    const dto = { page: params.page || 1, limit: params.limit || 20 };
    const { skip, take } = getPaginationParams(dto);
    const { items, total } = await this.professionalsRepository.findAll({ skip, take, ...params });
    return buildPaginatedResponse(items, total, dto);
  }

  async verify(id: string) {
    const prof = await this.professionalsRepository.findById(id);
    if (!prof) throw new NotFoundException('Professional not found');
    return this.professionalsRepository.updateStatus(id, 'verified');
  }
}
