const mongoose = require("mongoose");

const { Schema } = mongoose;

const ITEM_TYPES = ["clothing", "streakShield", "skin"];

const itemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    type: {
      type: String,
      enum: ITEM_TYPES,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    premiumOnly: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Item", itemSchema);
