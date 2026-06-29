import mongoose from 'mongoose';

const { Schema } = mongoose;

const habitBoostSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        habit: {
            type: Schema.Types.ObjectId,
            ref: 'Habit',
            required: true,
            index: true,
        },
        assetKey: {
            type: String,
            required: true,
            trim: true,
        },
        bonusCoins: {
            type: Number,
            required: true,
            min: 0,
        },
        remainingCompletions: {
            type: Number,
            required: true,
            min: 0,
        },
        rewardedPeriodKeys: {
            type: [String],
            default: [],
        },
        completedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

habitBoostSchema.index(
    { user: 1, habit: 1 },
    {
        unique: true,
        partialFilterExpression: {
            remainingCompletions: { $gt: 0 },
        },
    },
);

export default mongoose.model('HabitBoost', habitBoostSchema);
