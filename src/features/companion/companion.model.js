import mongoose from 'mongoose';

const { Schema } = mongoose;

const companionSchema = new Schema(
  {
     user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 30,
    },

    inventorySize: {
      type: Number,
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Companion', companionSchema);
