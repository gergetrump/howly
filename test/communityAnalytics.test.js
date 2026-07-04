import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
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
        User.deleteMany({}),
    ]);
});

after(async () => {
    await mongoose.disconnect();
    if (mongo) {
        await mongo.stop();
    }
});

test('GET /api/community/analytics returns anonymous community aggregates', async () => {
    const userA = await buildUser({ username: 'user_a', email: 'a@example.com' });
    const userB = await buildUser({ username: 'user_b', email: 'b@example.com' });
    const token = authHeader(userA);
    const completedAt = new Date();

    const [runHabit, readHabit] = await Promise.all([
        Habit.create({
            title: 'Morning run',
            type: 'boolean',
            frequency: 'Daily',
            ownerId: userA._id,
            category: 'Movement',
            taxonomy: {
                categoryKey: 'movement',
                subcategoryKey: 'cardio',
                canonicalHabitKey: 'run',
                score: 0.9,
                assignedAt: completedAt,
            },
        }),
        Habit.create({
            title: 'Read book',
            type: 'boolean',
            frequency: 'Daily',
            ownerId: userB._id,
            category: 'Learning',
            taxonomy: {
                categoryKey: 'learning',
                subcategoryKey: 'reading',
                canonicalHabitKey: 'read',
                score: 0.88,
                assignedAt: completedAt,
            },
        }),
    ]);

    await HabitCheckIn.create([
        {
            user: userA._id,
            habit: runHabit._id,
            completedAt,
            periodKey: completedAt.toISOString().slice(0, 10),
        },
        {
            user: userA._id,
            habit: runHabit._id,
            completedAt: new Date(completedAt.getTime() - 60_000),
            periodKey: completedAt.toISOString().slice(0, 10),
        },
        {
            user: userB._id,
            habit: readHabit._id,
            completedAt,
            periodKey: completedAt.toISOString().slice(0, 10),
        },
    ]);

    const response = await request(app)
        .get('/api/community/analytics?period=week')
        .set('Authorization', token)
        .expect(200);

    assert.equal(response.body.data.period.key, 'week');
    assert.equal(response.body.data.summary.checkIns, 3);
    assert.equal(response.body.data.summary.activeUsers, 2);
    assert.equal(response.body.data.summary.topCategory.categoryKey, 'movement');
    assert.equal(response.body.data.byCategory.length, 2);
    assert.equal(response.body.data.trendingHabits.length, 2);
    assert.equal(response.body.data.trendingHabits[0].canonicalHabitKey, 'run');
    assert.equal(response.body.data.trendingHabits[0].checkIns, 2);

    const todayResponse = await request(app)
        .get('/api/community/analytics?period=today')
        .set('Authorization', token)
        .expect(200);

    assert.equal(todayResponse.body.data.period.key, 'today');
    assert.equal(todayResponse.body.data.summary.checkIns, 3);
    assert.equal(todayResponse.body.data.summary.activeUsers, 2);
});

test('GET /api/community/analytics excludes deleted users', async () => {
    const activeUser = await buildUser({ username: 'active_user', email: 'active@example.com' });
    const deletedUser = await buildUser({
        username: 'deleted_user',
        email: 'deleted@example.com',
        isDeleted: true,
    });
    const token = authHeader(activeUser);
    const completedAt = new Date();

    const habits = await Promise.all([
        Habit.create({
            title: 'Active habit',
            type: 'boolean',
            frequency: 'Daily',
            ownerId: activeUser._id,
            category: 'Movement',
            taxonomy: {
                categoryKey: 'movement',
                subcategoryKey: 'cardio',
                canonicalHabitKey: 'run',
                score: 0.9,
                assignedAt: completedAt,
            },
        }),
        Habit.create({
            title: 'Deleted user habit',
            type: 'boolean',
            frequency: 'Daily',
            ownerId: deletedUser._id,
            category: 'Learning',
            taxonomy: {
                categoryKey: 'learning',
                subcategoryKey: 'reading',
                canonicalHabitKey: 'read',
                score: 0.88,
                assignedAt: completedAt,
            },
        }),
    ]);

    await HabitCheckIn.create([
        {
            user: activeUser._id,
            habit: habits[0]._id,
            completedAt,
            periodKey: completedAt.toISOString().slice(0, 10),
        },
        {
            user: deletedUser._id,
            habit: habits[1]._id,
            completedAt,
            periodKey: completedAt.toISOString().slice(0, 10),
        },
    ]);

    const response = await request(app)
        .get('/api/community/analytics?period=week')
        .set('Authorization', token)
        .expect(200);

    assert.equal(response.body.data.summary.checkIns, 1);
    assert.equal(response.body.data.summary.activeUsers, 1);
});
