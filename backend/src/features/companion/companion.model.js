import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Supported companion species. Used both by the schema enum and by the
 * companion service to validate the type a user picks during onboarding.
 */
export const COMPANION_TYPES = ['wolf', 'panda', 'bear'];

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

    // The chosen companion species (selected during onboarding).
    type: {
      type: String,
      enum: COMPANION_TYPES,
      default: 'wolf',
      required: true,
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
