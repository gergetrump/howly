import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ITEM_TYPES = ['accessory', 'powerUp', 'clothing', 'skin', 'streakShield'];

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
            index: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 240,
        },
        assetKey: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
            unique: true,
        },
        premiumOnly: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    },
);

itemSchema.index({ type: 1, price: 1 });

export default mongoose.model('Item', itemSchema);
