import mongoose from 'mongoose';

const { Schema } = mongoose;

const MILESTONE_INTERVAL_DAYS = 10;
const MILESTONE_VISIBLE_HOURS = 24;

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

export const MilestonePost = mongoose.model('MilestonePost', milestonePostSchema);
export const MilestoneLike = mongoose.model('MilestoneLike', milestoneLikeSchema);

export { MILESTONE_INTERVAL_DAYS, MILESTONE_VISIBLE_HOURS };
