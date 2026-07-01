import mongoose from 'mongoose';

const { Schema } = mongoose;
const READ_NOTIFICATION_TTL_SECONDS = 30 * 24 * 60 * 60;

export const NOTIFICATION_TYPES = [
  'friend_request_received',
  'friend_request_accepted',
  'milestone_reacted',
  'story_liked',
  'story_commented',
  'story_tagged',
];

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ['friendRequest', 'milestone', 'story'],
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, entityType: 1, entityId: 1, actor: 1 });
notificationSchema.index(
  { readAt: 1 },
  {
    expireAfterSeconds: READ_NOTIFICATION_TTL_SECONDS,
    partialFilterExpression: { readAt: { $type: 'date' } },
  }
);

export const Notification = mongoose.model('Notification', notificationSchema);
