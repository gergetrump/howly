import mongoose from 'mongoose';

const { Schema } = mongoose;

export const REPORT_TAGS = [
  'Hate Speech or Harassment',
  'Explicit or Dangerous Content',
  'Fraud & Scams',
  'Spam or Misinformation',
];

const reportSchema = new Schema(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tags: [
      {
        type: String,
        enum: REPORT_TAGS,
      },
    ],
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    attachment: {
      filename: String,
      mimeType: String,
      size: Number,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

reportSchema.index({ reportedUser: 1, createdAt: -1 });

export const Report = mongoose.model('Report', reportSchema);
