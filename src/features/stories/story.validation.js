import mongoose from 'mongoose';
import { STORY_SOURCE_TYPES } from './story.model.js';
import { validateOffsetPagination } from '../../utils/pagination.js';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const DEFAULT_STORY_LIST_LIMIT = 10;
const MAX_STORY_LIST_LIMIT = 50;

/* Validates that a story id is a well-formed ObjectId. */
export function validateStoryId(id) {
  if (!isNonEmptyString(id) || !isValidObjectId(id)) {
    return { error: 'storyId must be a valid ObjectId' };
  }

  return { value: id.trim() };
}

/* Validates and normalizes the create-story body (source type/id and optional caption). */
export function validateCreateStoryInput(body = {}) {
  const errors = [];

  if (!STORY_SOURCE_TYPES.includes(body.sourceType)) {
    errors.push(`sourceType must be one of: ${STORY_SOURCE_TYPES.join(', ')}`);
  }

  if (!isNonEmptyString(body.sourceId) || !isValidObjectId(body.sourceId)) {
    errors.push('sourceId must be a valid ObjectId');
  }

  let caption = '';

  if (body.caption !== undefined) {
    if (typeof body.caption !== 'string') {
      errors.push('caption must be a string');
    } else if (body.caption.trim().length > 200) {
      errors.push('caption must be 200 characters or less');
    } else {
      caption = body.caption.trim();
    }
  }

  if (errors.length) {
    return { error: errors.join(', ') };
  }

  return {
    value: {
      sourceType: body.sourceType,
      sourceId: body.sourceId.trim(),
      caption,
    },
  };
}

/* Validates and normalizes a comment body (content and optional parent comment id). */
export function validateCommentInput(body = {}) {
  const errors = [];
  
  if (!isNonEmptyString(body.content)) {
    errors.push('content is required');
  } else if (body.content.trim().length > 500) {
    errors.push('content must be 500 characters or less');
  }

  let parentCommentId = null;

  if (body.parentCommentId !== undefined && body.parentCommentId !== null) {
    if (!isNonEmptyString(body.parentCommentId) || !isValidObjectId(body.parentCommentId)) {
      errors.push('parentCommentId must be a valid ObjectId');
    } else {
      parentCommentId = body.parentCommentId.trim();
    }
  }

  if (errors.length) {
    return { error: errors.join(', ') };
  }

  return {
    value: {
      content: body.content.trim(),
      parentCommentId,
    },
  };
}

/* Validates offset pagination query params for story list endpoints. */
export function validateStoryListPagination(query = {}, options = {}) {
  return validateOffsetPagination(query, {
    defaultLimit: options.defaultLimit ?? DEFAULT_STORY_LIST_LIMIT,
    maxLimit: options.maxLimit ?? MAX_STORY_LIST_LIMIT,
  });
}
