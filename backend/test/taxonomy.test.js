import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import User from '../src/features/users/user.model.js';
import { getTaxonomyCategories } from '../src/features/taxonomy/taxonomyCategories.js';

let mongo;
let app;

async function buildUser(overrides = {}) {
    const suffix = Math.random().toString(36).slice(2, 10);

    return User.create({
        username: overrides.username || `tax_user_${suffix}`,
        email: overrides.email || `tax_user_${suffix}@example.com`,
        firstName: overrides.firstName || 'Tax',
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
    process.env.JWT_SECRET = 'test-secret';
    mongo = await MongoMemoryServer.create();
    await connectDB(mongo.getUri());
    app = createApp();
});

afterEach(async () => {
    await User.deleteMany({});
});

after(async () => {
    await mongoose.disconnect();

    if (mongo) {
        await mongo.stop();
    }
});

test('getTaxonomyCategories returns active categories sorted by sortOrder', () => {
    const categories = getTaxonomyCategories();

    assert.ok(categories.length >= 10);
    assert.equal(categories[0].key, 'movement');
    assert.equal(categories[0].label, 'Movement');
    assert.ok(categories.every((category) => category.key && category.label && Number.isInteger(category.sortOrder)));

    for (let index = 1; index < categories.length; index += 1) {
        assert.ok(categories[index - 1].sortOrder <= categories[index].sortOrder);
    }
});

test('GET /api/taxonomy/categories returns active categories', async () => {
    const user = await buildUser();

    const response = await request(app)
        .get('/api/taxonomy/categories')
        .set('Authorization', authHeader(user))
        .expect(200);

    assert.ok(Array.isArray(response.body.data));
    assert.equal(response.body.data[0].key, 'movement');
    assert.equal(response.body.data.some((category) => category.key === 'nutrition'), true);
});

test('GET /api/taxonomy/categories requires authentication', async () => {
    await request(app)
        .get('/api/taxonomy/categories')
        .expect(401);
});
