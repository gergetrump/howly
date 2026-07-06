import mongoose from 'mongoose';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const DEFAULT_FEED_LIMIT = 10;
const MAX_FEED_LIMIT = 50;

export function validateMilestonePostId(id) {
  if (!isValidObjectId(id)) {
    return { error: 'milestonePostId must be a valid ObjectId' };
  }

  return { value: id };
}

export function validateFeedPagination(query = {}) {
  const hasPagination = query.limit !== undefined || query.offset !== undefined;

  if (!hasPagination) {
    return { value: null };
  }

  const limit = Number.parseInt(query.limit ?? DEFAULT_FEED_LIMIT, 10);
  const offset = Number.parseInt(query.offset ?? 0, 10);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_FEED_LIMIT) {
    return { error: `limit must be between 1 and ${MAX_FEED_LIMIT}` };
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
