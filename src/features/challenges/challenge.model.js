import mongoose from 'mongoose';
import { taxonomySchema } from '../taxonomy/taxonomy.schema.js';

const { Schema } = mongoose;

export const CHALLENGE_FREQUENCIES = ["daily", "weekly", "monthly"];

export const CHALLENGE_STATUS = ["notStarted", "active", "completed", "failed"];

export const CHALLENGE_VISIBILITIES = ["public", "friends"];
export const MAX_CHALLENGE_DURATION_DAYS = 92;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const habitTemplateSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    icon: {
      type: String,
      default: "C",
    },
    type: {
      type: String,
      enum: ["boolean", "numeric"],
      default: "boolean",
    },
    target: {
      type: Number,
      default: null,
    },
    unit: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    frequency: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly"],
      required: true,
    },
    customDays: [{
      type: Number,
      min: 1,
      max: 7,
    }],
    category: {
      type: String,
      default: "Challenge",
    },
  },
  { _id: false }
);

function calculateEndDate(startsAt, durationDays) {
  return new Date(startsAt.getTime() + durationDays * DAY_IN_MS);
}

const challengeSchema = new Schema(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    habitTitle: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    habitTemplate: {
      type: habitTemplateSchema,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    coinReward: {
      type: Number,
      required: true,
      min: 0,
    },
    frequency: {
      type: String,
      enum: CHALLENGE_FREQUENCIES,
      required: true,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_CHALLENGE_DURATION_DAYS,
    },
    startsAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: CHALLENGE_STATUS,
      default: "notStarted",
    },
    visibility: {
      type: String,
      enum: CHALLENGE_VISIBILITIES,
      default: "public",
      index: true,
    },
    taxonomy: {
      type: taxonomySchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

challengeSchema.pre("validate", function setEndDate() {
  if (!this.endsAt && this.startsAt && this.durationDays) {
    this.endsAt = calculateEndDate(this.startsAt, this.durationDays);
  }
});

export default mongoose.model("Challenge", challengeSchema);
