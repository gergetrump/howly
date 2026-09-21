import mongoose from 'mongoose';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

function validateObjectId(value, fieldName) {
  if (!isNonEmptyString(value)) {
    return { error: `${fieldName} is required` };
  }

  if (!isValidObjectId(value)) {
    return { error: `${fieldName} must be a valid ObjectId` };
  }

  return { value: value.trim() };
}

export function validateSendFriendRequestInput(body = {}) {
  return validateObjectId(body.recipientId, 'recipientId');
}

export function validateFriendRequestId(id) {
  return validateObjectId(id, 'requestId');
}

export function validateFriendshipId(id) {
  return validateObjectId(id, 'friendshipId');
}
