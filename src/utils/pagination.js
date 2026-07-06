export function validateOffsetPagination(query = {}, {
  defaultLimit = 10,
  maxLimit = 50,
  hasPagination = query.limit !== undefined || query.offset !== undefined,
} = {}) {
  if (!hasPagination) {
    return { value: null };
  }

  const limit = Number.parseInt(query.limit ?? defaultLimit, 10);
  const offset = Number.parseInt(query.offset ?? 0, 10);

  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    return { error: `limit must be between 1 and ${maxLimit}` };
  }

  if (!Number.isInteger(offset) || offset < 0) {
    return { error: 'offset must be 0 or greater' };
  }

  return {
    value: {
      limit,
      offset,
      fetchLimit: offset + limit + 1,
    },
  };
}

export function toOffsetPage(items, pagination) {
  const end = pagination.offset + pagination.limit;
  const pageItems = items.slice(pagination.offset, end);

  return {
    items: pageItems,
    hasMore: items.length > end,
    limit: pagination.limit,
    offset: pagination.offset,
    nextOffset: pagination.offset + pageItems.length,
  };
}

