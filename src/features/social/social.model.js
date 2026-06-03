import mongoose from 'mongoose';

const { Schema } = mongoose;

const FRIEND_REQUEST_STATUS = ['pending', 'accepted', 'rejected'];
const MILESTONE_INTERVAL_DAYS = 10;
const MILESTONE_VISIBLE_HOURS = 24;

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

const milestonePostSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    habit: {
      type: Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
      index: true,
    },
    habitTitle: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    streakDays: {
      type: Number,
      required: true,
      min: MILESTONE_INTERVAL_DAYS,
      validate: {
        validator(value) {
          return value % MILESTONE_INTERVAL_DAYS === 0;
        },
        message: `Milestone streak must be a ${MILESTONE_INTERVAL_DAYS}-day interval.`,
      },
    },
    visibleUntil: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + MILESTONE_VISIBLE_HOURS * 60 * 60 * 1000),
      index: true,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

milestonePostSchema.index({ habit: 1, streakDays: 1 }, { unique: true });
milestonePostSchema.index({ user: 1, createdAt: -1 });

const milestoneLikeSchema = new Schema(
  {
    milestonePost: {
      type: Schema.Types.ObjectId,
      ref: 'MilestonePost',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

milestoneLikeSchema.index({ milestonePost: 1, user: 1 }, { unique: true });

export const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);
export const Friendship = mongoose.model('Friendship', friendshipSchema);
export const MilestonePost = mongoose.model('MilestonePost', milestonePostSchema);
export const MilestoneLike = mongoose.model('MilestoneLike', milestoneLikeSchema);

export { FRIEND_REQUEST_STATUS, MILESTONE_INTERVAL_DAYS, MILESTONE_VISIBLE_HOURS };
