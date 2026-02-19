import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { PaginationDto, buildPaginatedResponse, getPaginationParams } from '../../../common/utils/pagination.util';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async findById(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(page = 1, limit = 20, search?: string) {
    const dto: PaginationDto = { page, limit };
    const { skip, take } = getPaginationParams(dto);
    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
          deletedAt: null,
        }
      : { deletedAt: null };

    const { users, total } = await this.usersRepository.findAll({ skip, take, where });
    return buildPaginatedResponse(users, total, dto);
  }

  async update(id: string, data: { firstName?: string; lastName?: string; phone?: string; avatar?: string }) {
    await this.findById(id);
    return this.usersRepository.update(id, data);
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.usersRepository.softDelete(id);
  }
}
