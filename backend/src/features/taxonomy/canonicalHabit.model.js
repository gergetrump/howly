import mongoose from 'mongoose';

const { Schema } = mongoose;

const canonicalHabitSchema = new Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        label: {
            type: String,
            required: true,
            trim: true,
        },
        categoryKey: {
            type: String,
            required: true,
            trim: true,
        },
        subcategoryKey: {
            type: String,
            required: true,
            trim: true,
        },
        categoryLabel: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
        aliases: [{
            type: String,
            trim: true,
        }],
        status: {
            type: String,
            default: 'active',
        },
        embedding: [{
            type: Number,
        }],
    },
    {
        timestamps: true,
    },
);

export default mongoose.model('CanonicalHabit', canonicalHabitSchema);
