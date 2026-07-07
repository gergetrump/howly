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

test('GET /api/analytics/habits returns yearly monthly habit completion totals', async () => {
    const user = await buildUser();
    const token = authHeader(user);
    const currentYear = new Date().getFullYear();
    const createdAt = new Date(currentYear, 0, 1, 8, 0, 0, 0);
    const januaryCompletion = new Date(currentYear, 0, 15, 9, 30, 0, 0);
    const februaryCompletion = new Date(currentYear, 1, 10, 10, 0, 0, 0);
    const habit = await Habit.create({
        ownerId: user._id,
        title: 'Read',
        type: 'boolean',
        frequency: 'Daily',
        category: 'Productivity',
        createdAt,
        updatedAt: createdAt,
    });

    await Habit.updateOne({ _id: habit._id }, { $set: { createdAt } });
    await HabitCheckIn.create([
        {
            user: user._id,
            habit: habit._id,
            completedAt: januaryCompletion,
            periodKey: januaryCompletion.toISOString().slice(0, 10),
        },
        {
            user: user._id,
            habit: habit._id,
            completedAt: februaryCompletion,
            periodKey: februaryCompletion.toISOString().slice(0, 10),
        },
    ]);

    const response = await request(app)
        .get('/api/analytics/habits?period=year')
        .set('Authorization', token)
        .expect(200);

    assert.equal(response.body.data.period.key, 'year');
    assert.equal(response.body.data.monthlyTotals.length, 12);
    assert.equal(response.body.data.monthlyTotals[0].label, 'Jan');
    assert.equal(response.body.data.monthlyTotals[0].completed, 1);
    assert.equal(response.body.data.monthlyTotals[1].completed, 1);
    assert.equal(response.body.data.summary.completed, 2);
});

test('GET /api/analytics/habits can return a selected past year', async () => {
    const user = await buildUser();
    const token = authHeader(user);
    const currentYear = new Date().getFullYear();
    const pastYear = currentYear - 1;
    const createdAt = new Date(pastYear, 0, 1, 8, 0, 0, 0);
    const januaryCompletion = new Date(pastYear, 0, 15, 9, 30, 0, 0);
    const decemberCompletion = new Date(pastYear, 11, 20, 10, 0, 0, 0);
    const habit = await Habit.create({
        ownerId: user._id,
        title: 'Past Reading',
        type: 'boolean',
        frequency: 'Daily',
        createdAt,
        updatedAt: createdAt,
    });

    await Habit.updateOne({ _id: habit._id }, { $set: { createdAt } });
    await HabitCheckIn.create([
        {
            user: user._id,
            habit: habit._id,
            completedAt: januaryCompletion,
            periodKey: januaryCompletion.toISOString().slice(0, 10),
        },
        {
            user: user._id,
            habit: habit._id,
            completedAt: decemberCompletion,
            periodKey: decemberCompletion.toISOString().slice(0, 10),
        },
    ]);

    const response = await request(app)
        .get(`/api/analytics/habits?period=year&year=${pastYear}`)
        .set('Authorization', token)
        .expect(200);

    assert.equal(response.body.data.period.key, 'year');
    assert.equal(response.body.data.period.year, pastYear);
    assert.equal(response.body.data.monthlyTotals[0].completed, 1);
    assert.equal(response.body.data.monthlyTotals[11].completed, 1);
    assert.ok(response.body.data.availableYears.includes(currentYear));
    assert.ok(response.body.data.availableYears.includes(pastYear));
});

test('GET /api/analytics/habits compares average completion time with other users', async () => {
    const user = await buildUser();
    const earlierPeer = await buildUser();
    const laterPeer = await buildUser();
    const token = authHeader(user);
    const currentYear = new Date().getFullYear();
    const habit = await Habit.create({
        ownerId: user._id,
        title: 'Read',
        type: 'boolean',
        frequency: 'Daily',
        createdAt: new Date(currentYear, 0, 1, 8, 0, 0, 0),
    });
    const earlierPeerHabit = await Habit.create({
        ownerId: earlierPeer._id,
        title: 'Read',
        type: 'boolean',
        frequency: 'Daily',
        createdAt: new Date(currentYear, 0, 1, 8, 0, 0, 0),
    });
    const laterPeerHabit = await Habit.create({
        ownerId: laterPeer._id,
        title: 'Read',
        type: 'boolean',
        frequency: 'Daily',
        createdAt: new Date(currentYear, 0, 1, 8, 0, 0, 0),
    });
    const userCompletion = new Date(currentYear, 0, 10, 9, 0, 0, 0);
    const earlierPeerCompletion = new Date(currentYear, 0, 10, 7, 0, 0, 0);
    const laterPeerCompletion = new Date(currentYear, 0, 10, 11, 0, 0, 0);

    await HabitCheckIn.create([
        {
            user: user._id,
            habit: habit._id,
            completedAt: userCompletion,
            periodKey: userCompletion.toISOString().slice(0, 10),
        },
        {
            user: earlierPeer._id,
            habit: earlierPeerHabit._id,
            completedAt: earlierPeerCompletion,
            periodKey: earlierPeerCompletion.toISOString().slice(0, 10),
        },
        {
            user: laterPeer._id,
            habit: laterPeerHabit._id,
            completedAt: laterPeerCompletion,
            periodKey: laterPeerCompletion.toISOString().slice(0, 10),
        },
    ]);

    const response = await request(app)
        .get('/api/analytics/habits?period=year')
        .set('Authorization', token)
        .expect(200);

    assert.equal(response.body.data.summary.averageCompletionTimeComparison.earlierThanPercent, 50);
    assert.equal(response.body.data.summary.averageCompletionTimeComparison.comparedUsers, 2);
});

test('GET /api/analytics/habits uses latest completion date for an existing period event', async () => {
    const user = await buildUser();
    const token = authHeader(user);
    const currentYear = new Date().getFullYear();
    const staleCompletion = new Date(currentYear, 5, 29, 9, 0, 0, 0);
    const latestCompletion = new Date(currentYear, 6, 4, 12, 0, 0, 0);
    const habit = await Habit.create({
        ownerId: user._id,
        title: 'Weekly review',
        type: 'boolean',
        frequency: 'Weekly',
        createdAt: new Date(currentYear, 0, 1, 8, 0, 0, 0),
        lastCompletedAt: latestCompletion,
    });
    await HabitCheckIn.create({
        user: user._id,
        habit: habit._id,
        completedAt: staleCompletion,
        periodKey: `${currentYear}-W27`,
    });

    const response = await request(app)
        .get('/api/analytics/habits?period=year')
        .set('Authorization', token)
        .expect(200);

    assert.equal(response.body.data.monthlyTotals[5].completed, 0);
    assert.equal(response.body.data.monthlyTotals[6].completed, 1);
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

test('GET /api/analytics/challenges returns yearly monthly challenge totals', async () => {
    const owner = await buildUser({ isPremium: true });
    const token = authHeader(owner);
    const currentYear = new Date().getFullYear();
    const startedAt = new Date(currentYear, 0, 1, 8, 0, 0, 0);

    const challengeResponse = await request(app)
        .post('/api/challenges')
        .set('Authorization', token)
        .send({
            title: 'Yearly Sprint',
            description: 'Keep showing up',
            durationDays: 30,
            visibility: 'public',
            startsAt: startedAt.toISOString(),
            habitTemplate: {
                title: 'Show up',
                icon: 'Y',
                type: 'boolean',
                frequency: 'Daily',
                category: 'Productivity',
            },
        })
        .expect(201);
    const participant = await ChallengeParticipant.findOne({
        challenge: challengeResponse.body.challenge.id,
        user: owner._id,
    }).lean();
    const completedAt = new Date(currentYear, 0, 10, 10, 0, 0, 0);

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
        .get('/api/analytics/challenges?period=year')
        .set('Authorization', token)
        .expect(200);

    assert.equal(response.body.data.period.key, 'year');
    assert.equal(response.body.data.monthlyTotals.length, 12);
    assert.equal(response.body.data.monthlyTotals[0].completed, 1);
    assert.equal(response.body.data.challenges[0].monthly.length, 12);
    assert.equal(response.body.data.challenges[0].monthly[0].completed, 1);
});

test('GET /api/analytics/challenges can return a selected past year', async () => {
    const owner = await buildUser({ isPremium: true });
    const token = authHeader(owner);
    const currentYear = new Date().getFullYear();
    const pastYear = currentYear - 1;
    const startedAt = new Date(pastYear, 0, 1, 8, 0, 0, 0);

    const challengeResponse = await request(app)
        .post('/api/challenges')
        .set('Authorization', token)
        .send({
            title: 'Past Sprint',
            description: 'Keep showing up',
            durationDays: 30,
            visibility: 'public',
            startsAt: startedAt.toISOString(),
            habitTemplate: {
                title: 'Show up',
                icon: 'Y',
                type: 'boolean',
                frequency: 'Daily',
                category: 'Productivity',
            },
        })
        .expect(201);
    const participant = await ChallengeParticipant.findOne({
        challenge: challengeResponse.body.challenge.id,
        user: owner._id,
    }).lean();
    const completedAt = new Date(pastYear, 0, 10, 10, 0, 0, 0);

    await Promise.all([
        ChallengeParticipant.updateOne(
            { _id: participant._id },
            {
                $set: {
                    joinedAt: startedAt,
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
        .get(`/api/analytics/challenges?period=year&year=${pastYear}`)
        .set('Authorization', token)
        .expect(200);

    assert.equal(response.body.data.period.key, 'year');
    assert.equal(response.body.data.period.year, pastYear);
    assert.equal(response.body.data.monthlyTotals[0].completed, 1);
    assert.equal(response.body.data.challenges[0].monthly[0].completed, 1);
    assert.ok(response.body.data.availableYears.includes(currentYear));
    assert.ok(response.body.data.availableYears.includes(pastYear));
});

test('GET /api/analytics/challenges compares average completion time with other users', async () => {
    const user = await buildUser({ isPremium: true });
    const earlierPeer = await buildUser({ isPremium: true });
    const laterPeer = await buildUser({ isPremium: true });
    const currentYear = new Date().getFullYear();
    const startedAt = new Date(currentYear, 0, 1, 8, 0, 0, 0);

    async function createChallengeFor(owner, title) {
        const response = await request(app)
            .post('/api/challenges')
            .set('Authorization', authHeader(owner))
            .send({
                title,
                description: 'Compare timing',
                durationDays: 30,
                visibility: 'public',
                startsAt: startedAt.toISOString(),
                habitTemplate: {
                    title: 'Show up',
                    icon: 'T',
                    type: 'boolean',
                    frequency: 'Daily',
                    category: 'Productivity',
                },
            })
            .expect(201);

        return ChallengeParticipant.findOne({
            challenge: response.body.challenge.id,
            user: owner._id,
        }).lean();
    }

    const [participant, earlierPeerParticipant, laterPeerParticipant] = await Promise.all([
        createChallengeFor(user, 'Current Challenge'),
        createChallengeFor(earlierPeer, 'Early Challenge'),
        createChallengeFor(laterPeer, 'Late Challenge'),
    ]);
    const userCompletion = new Date(currentYear, 0, 10, 9, 0, 0, 0);
    const earlierPeerCompletion = new Date(currentYear, 0, 10, 7, 0, 0, 0);
    const laterPeerCompletion = new Date(currentYear, 0, 10, 11, 0, 0, 0);

    await HabitCheckIn.create([
        {
            user: user._id,
            habit: participant.habit,
            completedAt: userCompletion,
            periodKey: userCompletion.toISOString().slice(0, 10),
        },
        {
            user: earlierPeer._id,
            habit: earlierPeerParticipant.habit,
            completedAt: earlierPeerCompletion,
            periodKey: earlierPeerCompletion.toISOString().slice(0, 10),
        },
        {
            user: laterPeer._id,
            habit: laterPeerParticipant.habit,
            completedAt: laterPeerCompletion,
            periodKey: laterPeerCompletion.toISOString().slice(0, 10),
        },
    ]);

    const response = await request(app)
        .get('/api/analytics/challenges?period=year')
        .set('Authorization', authHeader(user))
        .expect(200);

    assert.equal(response.body.data.summary.averageCompletionTimeComparison.earlierThanPercent, 50);
    assert.equal(response.body.data.summary.averageCompletionTimeComparison.comparedUsers, 2);
});
