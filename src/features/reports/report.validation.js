import mongoose from 'mongoose';
import { REPORT_TAGS } from './report.model.js';

const MAX_MESSAGE_LENGTH = 2000;
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

function parseTags(value) {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export function validateCreateReportInput(body = {}) {
  const reportedUserId = body.reportedUserId;
  const message = isNonEmptyString(body.message) ? body.message.trim() : '';
  const tags = [...new Set(parseTags(body.tags))];

  if (!isNonEmptyString(reportedUserId)) {
    return { error: 'reportedUserId is required' };
  }

  if (!mongoose.Types.ObjectId.isValid(reportedUserId)) {
    return { error: 'reportedUserId must be a valid ObjectId' };
  }

  if (!message) {
    return { error: 'Report text is required' };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return { error: `Report text must be ${MAX_MESSAGE_LENGTH} characters or less` };
  }

  const invalidTag = tags.find((tag) => !REPORT_TAGS.includes(tag));

  if (invalidTag) {
    return { error: `Unsupported report tag: ${invalidTag}` };
  }

  return {
    value: {
      reportedUserId: reportedUserId.trim(),
      message,
      tags,
    },
  };
}
