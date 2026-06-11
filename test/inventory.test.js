import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import Item from '../src/features/items/item.model.js';
import UserItem from '../src/features/inventory/inventory.model.js';
import User from '../src/features/users/user.model.js';
import config from '../config.js';

let mongo;
let app;

async function buildUser(overrides = {}) {
    const suffix = Math.random().toString(36).slice(2, 10);

    return User.create({
        username: overrides.username || `inventory_user_${suffix}`,
        email: overrides.email || `inventory_user_${suffix}@example.com`,
        firstName: overrides.firstName || 'Inventory',
        lastName: overrides.lastName || 'User',
        passwordHash: overrides.passwordHash || 'hashed',
        authProvider: overrides.authProvider || 'local',
        coins: overrides.coins ?? 1000,
        ...overrides,
    });
}

async function buildItem(overrides = {}) {
    const suffix = Math.random().toString(36).slice(2, 10);

    return Item.create({
        name: overrides.name || `Inventory Item ${suffix}`,
        type: overrides.type || 'accessory',
        price: overrides.price ?? 100,
        assetKey: overrides.assetKey || `inventory_item_${suffix}`,
        premiumOnly: overrides.premiumOnly ?? false,
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
        Item.deleteMany({}),
        User.deleteMany({}),
        UserItem.deleteMany({}),
    ]);
});

after(async () => {
    await mongoose.disconnect();
    if (mongo) {
        await mongo.stop();
    }
});

test('free users cannot buy premium-only items', async () => {
    const user = await buildUser({ isPremium: false });
    const item = await buildItem({ premiumOnly: true });

    const response = await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({ itemId: item._id.toString() })
        .expect(403);

    assert.equal(response.body.code, 'PREMIUM_REQUIRED');
    assert.equal(await UserItem.countDocuments({ user: user._id }), 0);
});

test('premium users can buy premium-only items', async () => {
    const user = await buildUser({ isPremium: true, coins: 1000 });
    const item = await buildItem({ premiumOnly: true, price: 100 });

    const response = await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({ itemId: item._id.toString() })
        .expect(201);

    assert.equal(response.body.item._id, item._id.toString());
    assert.equal(await UserItem.countDocuments({ user: user._id, item: item._id }), 1);

    const updatedUser = await User.findById(user._id).lean();
    assert.equal(updatedUser.coins, 900);
});

test('free users can still buy non-premium items', async () => {
    const user = await buildUser({ isPremium: false, coins: 1000 });
    const item = await buildItem({ premiumOnly: false, price: 100 });

    const response = await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({ itemId: item._id.toString() })
        .expect(201);

    assert.equal(response.body.item._id, item._id.toString());
    assert.equal(await UserItem.countDocuments({ user: user._id, item: item._id }), 1);
});
