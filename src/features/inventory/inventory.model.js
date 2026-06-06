import mongoose from 'mongoose';

const { Schema } = mongoose;

const userItemSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        item: {
            type: Schema.Types.ObjectId,
            ref: 'Item',
            required: true,
        },
        equipped: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    },
);

userItemSchema.index({ user: 1, item: 1 }, { unique: true });

export default mongoose.model('UserItem', userItemSchema);
