import mongoose from 'mongoose';

const { Schema } = mongoose;

export const PARTICIPANT_STATUS = ["active", "completed", "failed", "left"];

const challengeParticipantSchema = new Schema(
  {
    challenge: {
      type: Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
      index: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: PARTICIPANT_STATUS,
      default: "active",
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    daysCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastCompletedAt: {
      type: Date,
      default: null,
    },

    rewardClaimed: {
      type: Boolean,
      default: false,
    },

    rewardClaimedAt: {
      type: Date,
      default: null,
    },

    rewardCoins: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

challengeParticipantSchema.index({ challenge: 1, user: 1 }, { unique: true });

export default mongoose.model(
  "ChallengeParticipant",
  challengeParticipantSchema
);
