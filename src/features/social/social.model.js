import mongoose from 'mongoose';

const { Schema } = mongoose;

const FRIEND_REQUEST_STATUS = ['pending', 'accepted', 'rejected'];

const friendRequestSchema = new Schema(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: FRIEND_REQUEST_STATUS,
      default: 'pending',
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

friendRequestSchema.index(
  { requester: 1, recipient: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
);

const friendshipSchema = new Schema(
  {
    userA: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userB: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    acceptedRequest: {
      type: Schema.Types.ObjectId,
      ref: 'FriendRequest',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

friendshipSchema.index({ userA: 1, userB: 1 }, { unique: true });

export const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);
export const Friendship = mongoose.model('Friendship', friendshipSchema);

export { FRIEND_REQUEST_STATUS };
