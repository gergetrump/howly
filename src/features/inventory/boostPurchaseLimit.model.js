import mongoose from 'mongoose';

const { Schema } = mongoose;

const boostPurchaseLimitSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        assetKey: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        monthKey: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        quantity: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    },
);

boostPurchaseLimitSchema.index({ user: 1, assetKey: 1, monthKey: 1 }, { unique: true });

export default mongoose.model('BoostPurchaseLimit', boostPurchaseLimitSchema);
