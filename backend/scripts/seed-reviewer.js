import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '../src/config/database.js';
import User from '../src/features/users/user.model.js';
import Companion from '../src/features/companion/companion.model.js';
import Habit from '../src/features/habits/habit.model.js';

const email = process.env.REVIEWER_EMAIL?.toLowerCase().trim() ?? '';
const password = process.env.REVIEWER_PASSWORD ?? '';

if (!email || !password || password === 'unset') {
    console.log('Reviewer credentials are unset. Skipping reviewer seed.');
    process.exit(0);
}

if (password.length < 8) {
    console.error('REVIEWER_PASSWORD must be at least 8 characters.');
    process.exit(1);
}

await connectDB();

const passwordHash = await bcrypt.hash(password, 12);
const verifiedAt = new Date();

let user = await User.findOne({ email }).select('+passwordHash');

if (!user) {
    user = await User.create({
        username: 'reviewer',
        email,
        firstName: 'Reviewer',
        lastName: 'Account',
        passwordHash,
        authProvider: 'local',
        isEmailVerified: true,
        emailVerifiedAt: verifiedAt,
        onboardingCompleted: true,
        coins: 40,
    });
    console.log(`Created reviewer ${email}`);
} else {
    user.passwordHash = passwordHash;
    user.isEmailVerified = true;
    user.emailVerifiedAt = user.emailVerifiedAt ?? verifiedAt;
    user.onboardingCompleted = true;
    user.isDeleted = false;
    await user.save();
    console.log(`Updated reviewer ${email}`);
}

const companion = await Companion.findOne({ user: user._id });
if (!companion) {
    await Companion.create({
        user: user._id,
        name: 'Howl',
        type: 'wolf',
    });
}

const habitCount = await Habit.countDocuments({ ownerId: user._id, deletedAt: null });
if (habitCount === 0) {
    await Habit.create({
        ownerId: user._id,
        title: 'Drink water',
        description: 'A glass of water to start the day.',
        frequency: 'Daily',
        category: 'Nutrition',
        icon: '💧',
        source: 'manual',
    });
}

await mongoose.disconnect();
