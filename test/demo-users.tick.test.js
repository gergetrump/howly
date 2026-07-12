import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import connectDB from '../src/config/database.js';
import User from '../src/features/users/user.model.js';
import Habit from '../src/features/habits/habit.model.js';
import HabitCheckIn from '../src/features/analytics/habitCheckIn.model.js';
import Challenge from '../src/features/challenges/challenge.model.js';
import ChallengeParticipant from '../src/features/challenges/challengeParticipant.model.js';
import { isCompletedForPeriod } from '../src/features/habits/habit.service.js';
import {
    countNonDemoCheckIns,
    countNonDemoUsers,
    createDailyRandom,
    demoUserIndexFromEmail,
    isChallengeTickEligible,
    resolveTickProbability,
    shouldTickHabit,
    tickDemoUsers,
} from '../scripts/demo-users/tick.js';
import { addDays, startOfDay } from '../scripts/demo-users/shared.js';

let mongo;

before(async () => {
    mongo = await MongoMemoryServer.create();
    await connectDB(mongo.getUri());
});

afterEach(async () => {
    await Promise.all([
        HabitCheckIn.deleteMany({}),
        ChallengeParticipant.deleteMany({}),
        Challenge.deleteMany({}),
        Habit.deleteMany({}),
        User.deleteMany({}),
    ]);
});

after(async () => {
    await mongoose.disconnect();
    if (mongo) {
        await mongo.stop();
    }
});

function buildRealUser() {
    const suffix = Math.random().toString(36).slice(2, 8);
    return User.create({
        username: `real_${suffix}`,
        email: `real_${suffix}@example.com`,
        firstName: 'Real',
        lastName: 'User',
        passwordHash: 'hashed',
        authProvider: 'local',
    });
}

function buildDemoUser(index = 1) {
    return User.create({
        username: `demo_${index}`,
        email: `seed+${String(index).padStart(3, '0')}@howly.demo`,
        firstName: 'Demo',
        lastName: 'User',
        passwordHash: 'hashed',
        authProvider: 'local',
        onboardingCompleted: true,
    });
}

function buildManualHabit(userId, overrides = {}) {
    return Habit.create({
        title: overrides.title ?? 'Morning walk',
        type: 'boolean',
        frequency: 'Daily',
        ownerId: userId,
        source: 'manual',
        streakCount: overrides.streakCount ?? 0,
        lastCompletedAt: overrides.lastCompletedAt ?? null,
        createdAt: overrides.createdAt ?? new Date(),
    });
}

test('demoUserIndexFromEmail parses seed addresses', () => {
    assert.equal(demoUserIndexFromEmail('seed+001@howly.demo'), 1);
    assert.equal(demoUserIndexFromEmail('seed+042@howly.demo'), 42);
});

test('resolveTickProbability favors active streaks and challenges', () => {
    const random = () => 0.5;
    const manualLow = resolveTickProbability({
        userIndex: 1,
        habit: { source: 'manual', streakCount: 0 },
        random,
    });
    const manualHigh = resolveTickProbability({
        userIndex: 1,
        habit: { source: 'manual', streakCount: 12 },
        random,
    });
    const challenge = resolveTickProbability({
        userIndex: 1,
        habit: { source: 'challenge', streakCount: 3 },
        random,
    });

    assert.ok(manualHigh > manualLow);
    assert.ok(challenge >= manualLow);
    assert.ok(manualHigh <= 0.98);
});

test('isChallengeTickEligible rejects ended or completed challenges', () => {
    const now = new Date('2026-07-12T12:00:00.000Z');
    const challenge = {
        status: 'active',
        startsAt: addDays(now, -5),
        endsAt: addDays(now, 10),
        durationDays: 30,
    };
    const participant = {
        status: 'active',
        daysCompleted: 4,
    };

    assert.equal(isChallengeTickEligible(challenge, participant, now), true);
    assert.equal(
        isChallengeTickEligible({ ...challenge, endsAt: addDays(now, -1) }, participant, now),
        false,
    );
    assert.equal(
        isChallengeTickEligible(challenge, { ...participant, status: 'completed' }, now),
        false,
    );
});

test('shouldTickHabit skips habits already completed for the period', () => {
    const today = startOfDay(new Date());
    const habit = {
        frequency: 'Daily',
        source: 'manual',
        streakCount: 5,
        lastCompletedAt: today,
    };
    const random = createDailyRandom(1, 'abc123', '2026-07-12');

    assert.equal(
        shouldTickHabit({ userIndex: 1, habit, random }),
        false,
    );
});

test('tickDemoUsers only updates demo users and is idempotent', async () => {
    const realUser = await buildRealUser();
    const demoUser = await buildDemoUser(1);

    const realHabit = await buildManualHabit(realUser._id, { title: 'Real habit' });
    const demoHabit = await buildManualHabit(demoUser._id, {
        title: 'Demo habit',
        streakCount: 6,
        lastCompletedAt: addDays(startOfDay(new Date()), -1),
    });

    const nonDemoUsersBefore = await countNonDemoUsers();
    const nonDemoCheckInsBefore = await countNonDemoCheckIns();

    const firstRun = await tickDemoUsers({ forceComplete: true });
    assert.ok(firstRun.completed >= 1);

    const realHabitAfter = await Habit.findById(realHabit._id).lean();
    const demoHabitAfter = await Habit.findById(demoHabit._id).lean();

    assert.equal(isCompletedForPeriod(realHabitAfter), false);
    assert.equal(isCompletedForPeriod(demoHabitAfter), true);
    assert.equal(await countNonDemoUsers(), nonDemoUsersBefore);
    assert.equal(await countNonDemoCheckIns(), nonDemoCheckInsBefore);

    const demoCheckIns = await HabitCheckIn.countDocuments({ user: demoUser._id });
    assert.ok(demoCheckIns >= 1);

    const secondRun = await tickDemoUsers();
    assert.equal(secondRun.alreadyCompleted, secondRun.habitsSeen);
    assert.equal(secondRun.completed, 0);
    assert.equal(await HabitCheckIn.countDocuments({ user: demoUser._id }), demoCheckIns);
});

test('tickDemoUsers dry-run makes no writes', async () => {
    const demoUser = await buildDemoUser(2);
    await buildManualHabit(demoUser._id, {
        streakCount: 3,
        lastCompletedAt: addDays(startOfDay(new Date()), -1),
    });

    const dryRun = await tickDemoUsers({ dryRun: true, forceComplete: true });
    assert.ok(dryRun.planned >= 1);
    assert.equal(dryRun.completed, 0);

    const checkIns = await HabitCheckIn.countDocuments({ user: demoUser._id });
    assert.equal(checkIns, 0);

    const habit = await Habit.findOne({ ownerId: demoUser._id }).lean();
    assert.equal(isCompletedForPeriod(habit), false);
});

test('tickDemoUsers advances active challenge habits', async () => {
    const demoUser = await buildDemoUser(3);
    const now = new Date();
    const challenge = await Challenge.create({
        title: 'Demo Challenge',
        description: 'Stay consistent',
        createdBy: demoUser._id,
        habitTitle: 'Stretch',
        habitTemplate: {
            title: 'Stretch',
            frequency: 'Daily',
        },
        frequency: 'daily',
        durationDays: 30,
        visibility: 'public',
        status: 'active',
        startsAt: addDays(now, -3),
        endsAt: addDays(now, 27),
        coinReward: 50,
    });

    const habit = await Habit.create({
        title: 'Stretch',
        type: 'boolean',
        frequency: 'Daily',
        ownerId: demoUser._id,
        source: 'challenge',
        challengeId: challenge._id,
        streakCount: 2,
        lastCompletedAt: addDays(startOfDay(now), -1),
    });

    await ChallengeParticipant.create({
        challenge: challenge._id,
        user: demoUser._id,
        habit: habit._id,
        status: 'active',
        daysCompleted: 2,
    });

    const result = await tickDemoUsers({ now, forceComplete: true });
    assert.ok(result.completed >= 1);

    const participant = await ChallengeParticipant.findOne({ user: demoUser._id, habit: habit._id }).lean();
    assert.ok(participant.daysCompleted >= 3);
    assert.ok(participant.lastCompletedAt);
});
