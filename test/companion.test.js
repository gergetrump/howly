import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import User from '../src/features/users/user.model.js';
import Companion from '../src/features/companion/companion.model.js';
import config from '../config.js';

let mongo;
let app;

async function buildUser(overrides = {}) {
    const suffix = Math.random().toString(36).slice(2, 10);

    return User.create({
        username: overrides.username || `companion_user_${suffix}`,
        email: overrides.email || `companion_user_${suffix}@example.com`,
        firstName: overrides.firstName || 'Companion',
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
    app = createApp();
    mongo = await MongoMemoryServer.create();
    await connectDB(mongo.getUri());
});

afterEach(async () => {
    await Promise.all([
        User.deleteMany({}),
        Companion.deleteMany({}),
    ]);
});

after(async () => {
    await mongoose.disconnect();
    if (mongo) {
        await mongo.stop();
    }
});

test('GET /api/companions/me requires authentication', async () => {
    await request(app).get('/api/companions/me').expect(401);
});

test('GET /api/companions/me returns null when no companion exists yet', async () => {
    const user = await buildUser();

    const response = await request(app)
        .get('/api/companions/me')
        .set('Authorization', authHeader(user))
        .expect(200);

    assert.equal(response.body.data, null);
});

test('PUT /api/companions/me creates a companion with the chosen type and name', async () => {
    const user = await buildUser();

    const response = await request(app)
        .put('/api/companions/me')
        .set('Authorization', authHeader(user))
        .send({ type: 'panda', name: 'Bamboo' })
        .expect(200);

    assert.equal(response.body.data.type, 'panda');
    assert.equal(response.body.data.name, 'Bamboo');
    assert.equal(response.body.data.inventorySize, 10);
    assert.ok(response.body.data.id);
    assert.equal(await Companion.countDocuments({ user: user._id }), 1);
});

test('PUT /api/companions/me switches the existing companion without creating a duplicate', async () => {
    const user = await buildUser();
    const header = authHeader(user);

    const first = await request(app)
        .put('/api/companions/me')
        .set('Authorization', header)
        .send({ type: 'panda', name: 'Bamboo' })
        .expect(200);

    const second = await request(app)
        .put('/api/companions/me')
        .set('Authorization', header)
        .send({ type: 'bear', name: 'Brownie' })
        .expect(200);

    assert.equal(second.body.data.type, 'bear');
    assert.equal(second.body.data.name, 'Brownie');
    // Same document was updated, not a new one.
    assert.equal(second.body.data.id, first.body.data.id);
    assert.equal(await Companion.countDocuments({ user: user._id }), 1);
});

test('GET /api/companions/me returns the previously selected companion', async () => {
    const user = await buildUser();
    const header = authHeader(user);

    await request(app)
        .put('/api/companions/me')
        .set('Authorization', header)
        .send({ type: 'wolf', name: 'Howly' })
        .expect(200);

    const response = await request(app)
        .get('/api/companions/me')
        .set('Authorization', header)
        .expect(200);

    assert.equal(response.body.data.type, 'wolf');
    assert.equal(response.body.data.name, 'Howly');
});

test('PUT /api/companions/me rejects an invalid companion type', async () => {
    const user = await buildUser();

    const response = await request(app)
        .put('/api/companions/me')
        .set('Authorization', authHeader(user))
        .send({ type: 'dragon', name: 'Smaug' })
        .expect(400);

    assert.equal(response.body.errorCode, 'BAD_REQUEST');
    assert.equal(await Companion.countDocuments({ user: user._id }), 0);
});

test('PUT /api/companions/me rejects an empty name', async () => {
    const user = await buildUser();

    await request(app)
        .put('/api/companions/me')
        .set('Authorization', authHeader(user))
        .send({ type: 'panda', name: '   ' })
        .expect(400);

    assert.equal(await Companion.countDocuments({ user: user._id }), 0);
});
