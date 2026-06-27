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
import config from '../config.js';

let mongo;
let app;

async function buildUser(overrides = {}) {
    const suffix = Math.random().toString(36).slice(2, 10);
    return User.create({
        username: overrides.username || `user_${suffix}`,
        email: overrides.email || `user_${suffix}@example.com`,
        firstName: overrides.firstName || 'Test',
        lastName: overrides.lastName || 'User',
        passwordHash: overrides.passwordHash || 'hashed',
        authProvider: overrides.authProvider || 'local',
        ...overrides,
    });
}

function authHeader(user) {
    return `Bearer ${signAccessToken(user)}`;
}

before(async () => {
    config.jwtSecret = 'test-secret';
    mongo = await MongoMemoryServer.create();
    await connectDB(mongo.getUri());
    app = createApp();
});

afterEach(async () => {
    await Promise.all([
        Habit.deleteMany({}),
        HabitCheckIn.deleteMany({}),
        Challenge.deleteMany({}),
        ChallengeParticipant.deleteMany({}),
        User.deleteMany({}),
    ]);
});

after(async () => {
    await mongoose.disconnect();
    if (mongo) {
        await mongo.stop();
    }
});

test('GET /api/analytics/habits returns weekly habit completion and timing analytics', async () => {
    const user = await buildUser();
    const token = authHeader(user);

    const readingResponse = await request(app)
        .post('/api/habits')
        .set('Authorization', token)
        .send({
            title: 'Read',
            type: 'boolean',
            frequency: 'Daily',
            category: 'Productivity',
        })
        .expect(201);

    await request(app)
        .post('/api/habits')
        .set('Authorization', token)
        .send({
            title: 'Run',
            type: 'boolean',
            frequency: 'Daily',
            category: 'Movement',
        })
        .expect(201);

    await request(app)
        .post(`/api/habits/${readingResponse.body.data.id}/check-ins`)
        .set('Authorization', token)
        .expect(200);

    const response = await request(app)
        .get('/api/analytics/habits?period=week')
        .set('Authorization', token)
        .expect(200);

    assert.equal(response.body.data.period.key, 'week');
    assert.equal(response.body.data.summary.completed, 1);
    assert.ok(response.body.data.summary.expected >= 2);
    assert.ok(response.body.data.summary.averageCompletionTime.label);

    const readingAnalytics = response.body.data.habits.find((item) => item.habit.title === 'Read');
    assert.equal(readingAnalytics.completed, 1);
    assert.ok(readingAnalytics.averageCompletionTime.label);

    const runningAnalytics = response.body.data.habits.find((item) => item.habit.title === 'Run');
    assert.equal(runningAnalytics.completed, 0);
});

test('GET /api/analytics/challenges returns challenge progress and timing analytics', async () => {
    const owner = await buildUser({ isPremium: true });
    const token = authHeader(owner);
    const startedYesterday = new Date();
    startedYesterday.setDate(startedYesterday.getDate() - 1);

    const challengeResponse = await request(app)
        .post('/api/challenges')
        .set('Authorization', token)
        .send({
            title: 'Reading Sprint',
            description: 'Read every day',
            durationDays: 14,
            visibility: 'public',
            startsAt: startedYesterday.toISOString(),
            habitTemplate: {
                title: 'Read 10 pages',
                icon: 'R',
                type: 'numeric',
                target: 10,
                unit: 'pages',
                frequency: 'Daily',
                category: 'Productivity',
            },
        })
        .expect(201);
    const participant = await ChallengeParticipant.findOne({
        challenge: challengeResponse.body.challenge.id,
        user: owner._id,
    }).lean();

    const completedAt = new Date();
    await Promise.all([
        ChallengeParticipant.updateOne(
            { _id: participant._id },
            {
                $set: {
                    daysCompleted: 1,
                    lastCompletedAt: completedAt,
                },
            },
        ),
        HabitCheckIn.create({
            user: owner._id,
            habit: participant.habit,
            completedAt,
            periodKey: completedAt.toISOString().slice(0, 10),
        }),
    ]);

    const response = await request(app)
        .get('/api/analytics/challenges?period=week')
        .set('Authorization', token)
        .expect(200);

    assert.equal(response.body.data.period.key, 'week');
    assert.equal(response.body.data.summary.activeChallengeCount, 1);
    assert.equal(response.body.data.summary.completed, 1);
    assert.ok(response.body.data.summary.averageCompletionTime.label);
    assert.equal(response.body.data.challenges.length, 1);
    assert.equal(response.body.data.challenges[0].challenge.title, 'Reading Sprint');
    assert.equal(response.body.data.challenges[0].participant.daysCompleted, 1);
});
