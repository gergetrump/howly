import mongoose from 'mongoose';
import { validateOffsetPagination } from '../../utils/pagination.js';

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
  return validateOffsetPagination(query, {
    defaultLimit: DEFAULT_FEED_LIMIT,
    maxLimit: MAX_FEED_LIMIT,
  });
}
