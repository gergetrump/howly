import mongoose from 'mongoose';

const { Schema } = mongoose;

const habitCheckInSchema = new Schema(
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
        completedAt: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },
        periodKey: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

habitCheckInSchema.index({ user: 1, completedAt: -1 });
habitCheckInSchema.index({ user: 1, habit: 1, periodKey: 1 }, { unique: true });

export default mongoose.model('HabitCheckIn', habitCheckInSchema);
