import mongoose from 'mongoose';

const { Schema } = mongoose;

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Custom'];
const CATEGORIES = ['Movement', 'Productivity', 'Nutrition', 'Connection'];

const habitSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: '',
        },
        icon: {
            type: String,
            default: '🎯',
        },
        type: {
            type: String,
            enum: ['boolean', 'numeric'],
            required: true,
            default: 'boolean',
        },
        target: {
            type: Number,
        },
        unit: {
            type: String,
            trim: true,
            maxlength: 50,
        },
        frequency: {
            type: String,
            enum: FREQUENCIES,
            required: true,
        },
        customDays: [{
            type: Number,
            min: 1,
            max: 7,
        }],
        category: {
            type: String,
        },
        // Origin metadata for cross-user analytics of onboarding starter habits.
        source: {
            type: String,
            enum: ['manual', 'onboarding', 'challenge'],
            default: 'manual',
        },
        templateKey: {
            type: String,
            default: null,
        },
        // The goal an AI-suggested habit belongs to; used to group habits in the dashboard.
        goal: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },
        challengeId: {
            type: Schema.Types.ObjectId,
            ref: 'Challenge',
            default: null,
            index: true,
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        streakCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastCompletedAt: {
            type: Date,
            default: null,
        },
        streakRepairDeadline: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

habitSchema.index({ ownerId: 1, createdAt: -1 });

export { FREQUENCIES, CATEGORIES };
export default mongoose.model('Habit', habitSchema);
