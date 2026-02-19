/**
 * Build a standard success response object.
 * The ResponseTransformInterceptor will wrap this further.
 */
export function successResponse<T>(data: T, message = 'Success') {
  return { message, data };
}

/**
 * Build a paginated success response
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Success',
) {
  const totalPages = Math.ceil(total / limit);
  return {
    message,
    data: {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  };
}
