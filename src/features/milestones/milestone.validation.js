import mongoose from 'mongoose';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export function validateMilestonePostId(id) {
  if (!isValidObjectId(id)) {
    return { error: 'milestonePostId must be a valid ObjectId' };
  }

  return { value: id };
}
