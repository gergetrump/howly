import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import User from '../src/features/users/user.model.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';

let mongo;
let app;

// Create a user with safe defaults, allowing overrides per test.
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

// Spin up an in-memory MongoDB and app instance for the test suite.
before(async () => {
    process.env.JWT_SECRET = 'test-secret';
    mongo = await MongoMemoryServer.create();
    await connectDB(mongo.getUri());
    app = createApp();
});

// Reset users between tests to keep isolation.
afterEach(async () => {
    await User.deleteMany({});
});

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

// Ensures a user can update their profile fields via /me.
test('PATCH /api/users/me updates profile fields', async () => {
    const user = await buildUser();
    const token = signAccessToken(user);

    const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
            firstName: 'Updated',
            lastName: 'Name',
            email: 'updated@example.com',
        })
        .expect(200);

    assert.equal(response.body.firstName, 'Updated');
    assert.equal(response.body.lastName, 'Name');
    assert.equal(response.body.email, 'updated@example.com');

    const updatedUser = await User.findById(user._id);
    assert.equal(updatedUser.firstName, 'Updated');
    assert.equal(updatedUser.lastName, 'Name');
    assert.equal(updatedUser.email, 'updated@example.com');
});
