import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Build Prisma skip/take from pagination dto
 */
export function getPaginationParams(dto: PaginationDto): { skip: number; take: number } {
  const page = dto.page || 1;
  const limit = dto.limit || 20;
  return { skip: (page - 1) * limit, take: limit };
}

/**
 * Build paginated response envelope
 */
export function buildPaginatedResponse<T>(
  items: T[],
  total: number,
  dto: PaginationDto,
): PaginatedResponse<T> {
  const page = dto.page || 1;
  const limit = dto.limit || 20;
  const totalPages = Math.ceil(total / limit);

  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
