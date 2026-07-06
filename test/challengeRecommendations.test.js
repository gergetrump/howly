import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import Challenge from '../src/features/challenges/challenge.model.js';
import ChallengeParticipant from '../src/features/challenges/challengeParticipant.model.js';
import Habit from '../src/features/habits/habit.model.js';
import HabitCheckIn from '../src/features/analytics/habitCheckIn.model.js';
import User from '../src/features/users/user.model.js';
import {
    buildRecommendationReason,
    buildUserHabitProfile,
    resolveDefaultChallengeSort,
    scoreChallenge,
    sortChallengesByRecommendation,
} from '../src/features/challenges/challengeRecommendation.service.js';

let mongo;
let app;

async function buildUser(overrides = {}) {
    const suffix = Math.random().toString(36).slice(2, 10);

    return User.create({
        username: overrides.username || `rec_user_${suffix}`,
        email: overrides.email || `rec_user_${suffix}@example.com`,
        firstName: overrides.firstName || 'Rec',
        lastName: overrides.lastName || 'User',
        passwordHash: overrides.passwordHash || 'hashed',
        authProvider: overrides.authProvider || 'local',
        isPremium: overrides.isPremium ?? true,
        ...overrides,
    });
}

function authHeader(user) {
    return `Bearer ${signAccessToken(user)}`;
}

function periodKeyForDate(date) {
    return date.toISOString().slice(0, 10);
}

async function createChallengeViaApi(owner, overrides = {}) {
    const token = authHeader(owner);
    const { taxonomy, habitTitle, ...challengeOverrides } = overrides;
    const habitTemplate = challengeOverrides.habitTemplate || {
        title: habitTitle || 'Run',
        description: '',
        icon: 'C',
        type: 'boolean',
        frequency: 'Daily',
        category: 'Challenge',
    };

    const response = await request(app)
        .post('/api/challenges')
        .set('Authorization', token)
        .send({
            title: challengeOverrides.title || 'Challenge',
            habitTemplate,
            description: challengeOverrides.description || 'Challenge description',
            frequency: 'daily',
            durationDays: 30,
            visibility: challengeOverrides.visibility || 'public',
            ...challengeOverrides,
        })
        .expect(201);

    if (taxonomy) {
        await Challenge.findByIdAndUpdate(response.body.challenge.id, {
            $set: { taxonomy },
        });
    }

    return response.body.challenge;
}

async function createPersonalHabit(userId, overrides = {}) {
    return Habit.create({
        title: overrides.title || 'Morning run',
        type: 'boolean',
        frequency: 'Daily',
        ownerId: userId,
        source: 'manual',
        category: overrides.category || 'Movement',
        taxonomy: overrides.taxonomy || {
            categoryKey: 'movement',
            subcategoryKey: 'cardio',
            canonicalHabitKey: 'run',
            score: 0.9,
            assignedAt: new Date(),
        },
        ...overrides,
    });
}

before(async () => {
    process.env.JWT_SECRET = 'test-secret';
    mongo = await MongoMemoryServer.create();
    await connectDB(mongo.getUri());
    app = createApp();
});

afterEach(async () => {
    await Promise.all([
        ChallengeParticipant.deleteMany({}),
        Challenge.deleteMany({}),
        Habit.deleteMany({}),
        HabitCheckIn.deleteMany({}),
        User.deleteMany({}),
    ]);
});

after(async () => {
    await mongoose.disconnect();

    if (mongo) {
        await mongo.stop();
    }
});

test('scoreChallenge ranks exact canonical matches highest', () => {
    const profile = {
        categoryScores: { movement: 1, learning: 0.4 },
        subcategoryScores: { cardio: 1, reading: 0.4 },
        canonicalScores: { run: 1, read: 0.4 },
    };

    const runChallenge = {
        taxonomy: {
            categoryKey: 'movement',
            subcategoryKey: 'cardio',
            canonicalHabitKey: 'run',
        },
    };
    const readChallenge = {
        taxonomy: {
            categoryKey: 'learning',
            subcategoryKey: 'reading',
            canonicalHabitKey: 'read',
        },
    };

    assert.ok(scoreChallenge(runChallenge, profile) > scoreChallenge(readChallenge, profile));
});

test('buildUserHabitProfile weights recent check-ins higher', async () => {
    const user = await buildUser();
    const runHabit = await createPersonalHabit(user._id, {
        title: 'Run',
        taxonomy: {
            categoryKey: 'movement',
            subcategoryKey: 'cardio',
            canonicalHabitKey: 'run',
            score: 0.9,
            assignedAt: new Date(),
        },
    });
    await createPersonalHabit(user._id, {
        title: 'Read',
        taxonomy: {
            categoryKey: 'learning',
            subcategoryKey: 'reading',
            canonicalHabitKey: 'read',
            score: 0.9,
            assignedAt: new Date(),
        },
    });

    const completedAt = new Date();
    await HabitCheckIn.create({
        user: user._id,
        habit: runHabit._id,
        completedAt,
        periodKey: periodKeyForDate(completedAt),
        categoryKey: 'movement',
        canonicalHabitKey: 'run',
    });

    const profile = await buildUserHabitProfile(user._id);

    assert.ok(profile.canonicalScores.run > profile.canonicalScores.read);
    assert.ok(profile.categoryScores.movement > profile.categoryScores.learning);
});

test('sortChallengesByRecommendation puts unjoined challenges before joined ones', () => {
    const profile = {
        categoryScores: { movement: 1 },
        subcategoryScores: { cardio: 1 },
        canonicalScores: { run: 1 },
    };
    const participantCounts = new Map([
        ['joined', 5],
        ['unjoined', 1],
    ]);
    const viewerParticipations = new Map([
        ['joined', { status: 'active' }],
    ]);

    const joined = {
        _id: 'joined',
        taxonomy: { categoryKey: 'movement', subcategoryKey: 'cardio', canonicalHabitKey: 'run' },
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
    };
    const unjoined = {
        _id: 'unjoined',
        taxonomy: { categoryKey: 'learning', subcategoryKey: 'reading', canonicalHabitKey: 'read' },
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
    };

    const sorted = sortChallengesByRecommendation(
        [joined, unjoined],
        profile,
        participantCounts,
        viewerParticipations,
    );

    assert.equal(sorted[0]._id, 'unjoined');
    assert.equal(sorted[1]._id, 'joined');
});

test('resolveDefaultChallengeSort picks recommended for public and friends scopes', () => {
    assert.equal(resolveDefaultChallengeSort({ scope: 'public' }), 'recommended');
    assert.equal(resolveDefaultChallengeSort({ scope: 'friends' }), 'recommended');
    assert.equal(resolveDefaultChallengeSort({ scope: 'active' }), 'endsAt');
    assert.equal(resolveDefaultChallengeSort({}), 'createdAt');
});

test('buildRecommendationReason prefers canonical match wording', () => {
    const challenge = {
        taxonomy: {
            categoryKey: 'movement',
            subcategoryKey: 'cardio',
            canonicalHabitKey: 'run',
        },
    };
    const profile = {
        categoryScores: { movement: 1 },
        subcategoryScores: { cardio: 1 },
        canonicalScores: { run: 1 },
    };

    assert.equal(
        buildRecommendationReason(challenge, profile, {
            canonicalLabels: { run: 'Run' },
            categoryLabels: { movement: 'Movement' },
        }),
        'Because you track Run',
    );
});

test('GET /api/challenges?scope=public returns personalized order and reason', async () => {
    const creator = await buildUser({ username: 'creator', email: 'creator@example.com' });
    const viewer = await buildUser({ username: 'viewer', email: 'viewer@example.com' });
    const runHabit = await createPersonalHabit(viewer._id);

    const completedAt = new Date();
    await HabitCheckIn.create({
        user: viewer._id,
        habit: runHabit._id,
        completedAt,
        periodKey: periodKeyForDate(completedAt),
        categoryKey: 'movement',
        canonicalHabitKey: 'run',
    });

    await createChallengeViaApi(creator, {
        title: 'Read Daily',
        habitTitle: 'Read',
        taxonomy: {
            categoryKey: 'learning',
            subcategoryKey: 'reading',
            canonicalHabitKey: 'read',
            score: 0.9,
            assignedAt: new Date(),
        },
    });
    await createChallengeViaApi(creator, {
        title: 'Run Club',
        habitTitle: 'Run',
        taxonomy: {
            categoryKey: 'movement',
            subcategoryKey: 'cardio',
            canonicalHabitKey: 'run',
            score: 0.9,
            assignedAt: new Date(),
        },
    });

    const response = await request(app)
        .get('/api/challenges?scope=public')
        .set('Authorization', authHeader(viewer))
        .expect(200);

    assert.equal(response.body.length, 2);
    assert.equal(response.body[0].title, 'Run Club');
    assert.match(response.body[0].recommendationReason, /Because you track run/i);
});

test('GET /api/challenges rejects invalid sort values', async () => {
    const user = await buildUser();

    const response = await request(app)
        .get('/api/challenges?sort=popular')
        .set('Authorization', authHeader(user))
        .expect(400);

    assert.match(response.body.message, /sort must be one of/);
});

test('challenge habits are excluded from recommendation profile', async () => {
    const user = await buildUser();
    await Habit.create({
        title: 'Challenge habit',
        type: 'boolean',
        frequency: 'Daily',
        ownerId: user._id,
        source: 'challenge',
        taxonomy: {
            categoryKey: 'learning',
            subcategoryKey: 'reading',
            canonicalHabitKey: 'read',
            score: 0.9,
            assignedAt: new Date(),
        },
    });

    const profile = await buildUserHabitProfile(user._id);

    assert.deepEqual(profile.canonicalScores, {});
    assert.deepEqual(profile.categoryScores, {});
});
