import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import User from '../src/features/users/user.model.js';
import Habit from '../src/features/habits/habit.model.js';
import Companion from '../src/features/companion/companion.model.js';
import { FriendRequest } from '../src/features/social/social.model.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import config from '../config.js';

let mongo;
let app;

async function buildUser(overrides = {}) {
    const suffix = Math.random().toString(36).slice(2, 10);
    return User.create({
        username: overrides.username || `user_${suffix}`,
        email: overrides.email || `user_${suffix}@example.com`,
        firstName: overrides.firstName || 'Peter',
        lastName: overrides.lastName || 'Pan',
        passwordHash: overrides.passwordHash || 'hashed',
        authProvider: overrides.authProvider || 'local',
        isEmailVerified: true,
        ...overrides,
    });
}

before(async () => {
    config.jwtSecret = 'test-secret';
    mongo = await MongoMemoryServer.create();
    await connectDB(mongo.getUri());
    app = createApp();
});

afterEach(async () => {
    await Promise.all([
        User.deleteMany({}),
        Habit.deleteMany({}),
        Companion.deleteMany({}),
        FriendRequest.deleteMany({}),
    ]);
});

after(async () => {
    await mongoose.disconnect();
    if (mongo) {
        await mongo.stop();
    }
});

test('deleted users cannot access protected routes with an existing token', async () => {
    const user = await buildUser();
    const token = signAccessToken(user);

    await request(app)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

    await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
});

test('DELETE /api/users/me removes related user-owned data', async () => {
    const user = await buildUser({ username: 'delete_data', email: 'delete-data@example.com' });
    const friend = await buildUser({ username: 'friend_user', email: 'friend@example.com' });
    const token = signAccessToken(user);

    const habit = await Habit.create({
        title: 'Morning run',
        ownerId: user._id,
        frequency: 'Daily',
        category: 'Movement',
    });

    await Companion.create({
        user: user._id,
        name: 'Luna',
        type: 'wolf',
    });

    await FriendRequest.create({
        requester: user._id,
        recipient: friend._id,
        status: 'pending',
    });

    await request(app)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

    assert.equal(await User.exists({ _id: user._id }), null);
    assert.equal(await Habit.exists({ _id: habit._id }), null);
    assert.equal(await Companion.exists({ user: user._id }), null);
    assert.equal(await FriendRequest.exists({ requester: user._id }), null);
});

test('soft-deleted users cannot access protected routes', async () => {
    const user = await buildUser({ isDeleted: true });
    const token = signAccessToken(user);

    await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
});
