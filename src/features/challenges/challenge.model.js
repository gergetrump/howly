const mongoose = require("mongoose");

const { Schema } = mongoose;

const CHALLENGE_FREQUENCIES = ["daily", "weekly", "monthly"];

const CHALLENGE_STATUS = ["notStarted", "active", "completed", "failed"];

const challengeSchema = new Schema(
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
    status: {
      type: String,
      enum: CHALLENGE_STATUS,
      default: "notStarted",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Challenge", challengeSchema);
