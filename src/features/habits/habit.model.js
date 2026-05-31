import mongoose from 'mongoose';

const { Schema } = mongoose;

const HABIT_TYPES = ["boolean", "numeric"];

const habitSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: HABIT_TYPES,
      required: true,
    },
    done: {
      type: Boolean,
      default: false,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    streak: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Habit', habitSchema);
