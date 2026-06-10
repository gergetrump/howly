import mongoose from 'mongoose';
import { STORY_SOURCE_TYPES } from './story.model.js';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export function validateStoryId(id) {
  if (!isNonEmptyString(id) || !isValidObjectId(id)) {
    return { error: 'storyId must be a valid ObjectId' };
  }

  return { value: id.trim() };
}

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
