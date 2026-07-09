import mongoose from 'mongoose';

const { Schema } = mongoose;

export const STORY_SOURCE_TYPES = ['habit', 'challenge', 'milestone'];
export const STORY_FEED_VISIBLE_HOURS = 30 * 24;
export const STORY_ARCHIVE_DAYS = 90;

const storySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // --- Generic Source Context ---
    sourceType: {
      type: String,
      enum: STORY_SOURCE_TYPES,
      required: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    sourceTitle: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    sourceEmoji: {
      type: String,
      default: '🎯',
    },

    // --- Content ---
    imageUrl: {
      type: String,
      required: true,
    },
    // Cloudinary public_id — needed to delete the image when the story is deleted
    imagePublicId: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },

    // --- Lifecycle ---
    feedExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    archiveExpiresAt: {
      type: Date,
      required: true,
    },

    // --- Social ---
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-delete the document 90 days after creation (feed visibility is query-filtered, not TTL)
storySchema.index({ archiveExpiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ user: 1, createdAt: -1 });

const storyLikeSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    story: {
      type: Schema.Types.ObjectId,
      ref: 'Story',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

storyLikeSchema.index({ user: 1, story: 1 }, { unique: true });

const storyCommentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    story: {
      type: Schema.Types.ObjectId,
      ref: 'Story',
      required: true,
      index: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'StoryComment',
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    moderation: {
      status: {
        type: String,
        enum: ['approved', 'flagged', 'skipped'],
        default: 'skipped',
      },
      checkedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Story = mongoose.model('Story', storySchema);
export const StoryLike = mongoose.model('StoryLike', storyLikeSchema);
export const StoryComment = mongoose.model('StoryComment', storyCommentSchema);
