// src/utils/pagination.util.ts
import { IPaginationQuery, IPaginationResult } from '../types/interfaces';

export class PaginationUtil {
  static getPaginationParams(query: IPaginationQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    return {
      page,
      limit,
      skip,
      sortBy,
      sortOrder,
    };
  }

  static formatPaginationResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): IPaginationResult<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}