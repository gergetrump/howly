import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import User from '../src/features/users/user.model.js';
import Challenge from '../src/features/challenges/challenge.model.js';
import ChallengeParticipant from '../src/features/challenges/challengeParticipant.model.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import config from '../config.js';

let mongo;
let app;

// Create a user with safe defaults, allowing overrides per test.
async function buildUser(overrides = {}) {
    const suffix = Math.random().toString(36).slice(2, 10);
    return User.create({
        username: overrides.username || `user_${suffix}`,
        email: overrides.email || `user_${suffix}@example.com`,
        firstName: overrides.firstName || 'Peter',
        lastName: overrides.lastName || 'Pan',
        passwordHash: overrides.passwordHash || 'hashed',
        authProvider: overrides.authProvider || 'local',
        ...overrides,
    });
}

// Spin up an in-memory MongoDB and app instance for the test suite.
before(async () => {
    config.jwtSecret = 'test-secret';
    mongo = await MongoMemoryServer.create();
    await connectDB(mongo.getUri());
    app = createApp();
});

// Reset users between tests to keep isolation.
afterEach(async () => {
    await Promise.all([
        User.deleteMany({}),
        Challenge.deleteMany({}),
        ChallengeParticipant.deleteMany({}),
    ]);
});

async function buildChallenge(owner, overrides = {}) {
    const suffix = Math.random().toString(36).slice(2, 10);

    return Challenge.create({
        createdBy: owner._id,
        title: overrides.title || `Challenge ${suffix}`,
        habitTitle: overrides.habitTitle || `Habit ${suffix}`,
        habitTemplate: {
            title: overrides.habitTitle || `Habit ${suffix}`,
            frequency: 'Daily',
            icon: '🎯',
        },
        description: '',
        coinReward: 100,
        frequency: 'daily',
        durationDays: 7,
        startsAt: overrides.startsAt ?? new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        endsAt: overrides.endsAt ?? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: overrides.status ?? 'active',
        visibility: 'public',
        ...overrides,
    });
}

// Tear down database connections after all tests complete.
after(async () => {
    await mongoose.disconnect();
    if (mongo) {
        await mongo.stop();
    }
});

// Ensures the authenticated user can fetch their own profile.
test('GET /api/users/me returns current user', async () => {
    const user = await buildUser();
    const token = signAccessToken(user);

    const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

    assert.equal(response.body.id, user._id.toString());
    assert.equal(response.body.email, user.email);
    assert.ok(!('passwordHash' in response.body));
});

test('GET /api/users/me returns completed challenge count', async () => {
    const user = await buildUser();
    const otherUser = await buildUser();
    const token = signAccessToken(user);
    const completedByParticipant = await buildChallenge(user, {
        startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });
    const endedWithProgress = await buildChallenge(user);
    const endedWithoutProgress = await buildChallenge(user);
    const failedChallenge = await buildChallenge(user, { status: 'failed' });
    const leftChallenge = await buildChallenge(user);
    const otherUserChallenge = await buildChallenge(otherUser);

    await ChallengeParticipant.create([
        {
            challenge: completedByParticipant._id,
            user: user._id,
            status: 'completed',
            daysCompleted: 7,
        },
        {
            challenge: endedWithProgress._id,
            user: user._id,
            status: 'active',
            daysCompleted: 2,
        },
        {
            challenge: endedWithoutProgress._id,
            user: user._id,
            status: 'active',
            daysCompleted: 0,
        },
        {
            challenge: failedChallenge._id,
            user: user._id,
            status: 'failed',
            daysCompleted: 7,
        },
        {
            challenge: leftChallenge._id,
            user: user._id,
            status: 'left',
            daysCompleted: 2,
        },
        {
            challenge: otherUserChallenge._id,
            user: otherUser._id,
            status: 'completed',
            daysCompleted: 7,
        },
    ]);

    const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

    assert.equal(response.body.completedChallenges, 2);
});

test('GET /api/users/me/plan returns free plan details', async () => {
    const user = await buildUser({ isPremium: false });
    const token = signAccessToken(user);

    const response = await request(app)
        .get('/api/users/me/plan')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

    assert.equal(response.body.currentPlanKey, 'free');
    assert.equal(response.body.currentPlan.limits.maxHabits, 4);
    assert.equal(response.body.currentPlan.permissions.canCreateChallenges, false);
    assert.equal(response.body.plans.premium.limits.maxHabits, 20);
});

test('GET /api/users/me/plan returns premium plan details for premium users', async () => {
    const user = await buildUser({ isPremium: true });
    const token = signAccessToken(user);

    const response = await request(app)
        .get('/api/users/me/plan')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

    assert.equal(response.body.currentPlanKey, 'premium');
    assert.equal(response.body.currentPlan.limits.maxActiveChallenges, 8);
    assert.equal(response.body.currentPlan.monthlyBenefits.coins, 300);
});

test('DELETE /api/users/me permanently removes the current user', async () => {
    const email = 'delete-me@example.com';
    const user = await buildUser({ email, username: 'delete_me' });
    const token = signAccessToken(user);

    await request(app)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

    assert.equal(await User.exists({ _id: user._id }), null);

    const recreatedUser = await buildUser({ email, username: 'delete_me_again' });
    assert.equal(recreatedUser.email, email);
});

// Ensures a user can update their profile fields via /me.
test('PATCH /api/users/me updates profile fields', async () => {
    const user = await buildUser();
    const token = signAccessToken(user);

    const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
            firstName: 'Updated First Name',
            lastName: 'Updated Last Name',
            email: 'updated@example.com',
        })
        .expect(200);

    assert.equal(response.body.firstName, 'Updated First Name');
    assert.equal(response.body.lastName, 'Updated Last Name');
    assert.equal(response.body.email, 'updated@example.com');

    const updatedUser = await User.findById(user._id);
    assert.equal(updatedUser.firstName, 'Updated First Name');
    assert.equal(updatedUser.lastName, 'Updated Last Name');
    assert.equal(updatedUser.email, 'updated@example.com');
});

test('PATCH /api/users/me rejects unsafe username and display name updates', async () => {
    const user = await buildUser();
    const token = signAccessToken(user);

    await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'bad username' })
        .expect(400);

    await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: '<script>' })
        .expect(400);
});

test('PATCH /api/users/me merges partial notification preference updates', async () => {
    const user = await buildUser({
        notificationPreferences: {
            muteAll: false,
            muteTag: true,
            muteFriendRequest: true,
            muteComment: false,
            muteLike: false,
            muteReaction: true,
        },
    });
    const token = signAccessToken(user);

    const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
            notificationPreferences: {
                muteLike: true,
            },
        })
        .expect(200);

    assert.deepEqual(response.body.notificationPreferences, {
        emailEnabled: false,
        challengeInvitations: false,
        friendRequests: false,
        streakReminders: false,
        muteAll: false,
        muteTag: true,
        muteFriendRequest: true,
        muteComment: false,
        muteLike: true,
        muteReaction: true,
        muteChallengeInvitation: false,
    });

    const updatedUser = await User.findById(user._id).lean();
    assert.equal(updatedUser.notificationPreferences.muteTag, true);
    assert.equal(updatedUser.notificationPreferences.muteFriendRequest, true);
    assert.equal(updatedUser.notificationPreferences.muteLike, true);
    assert.equal(updatedUser.notificationPreferences.muteReaction, true);
});
