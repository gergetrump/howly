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
        UserItem.deleteMany({}),
        Item.deleteMany({}),
        User.deleteMany({}),
    ]);
});

after(async () => {
    await mongoose.disconnect();
    if (mongo) {
        await mongo.stop();
    }
});

test('save outfit equips selected items and unequips removed items', async () => {
    const user = await buildUser();
    const hoodie = await Item.create({ name: 'Hoodie', type: 'clothing', price: 300, assetKey: 'hoodie' });
    const glasses = await Item.create({ name: 'Glasses', type: 'accessory', price: 180, assetKey: 'glasses' });
    const cup = await Item.create({ name: 'Cup', type: 'accessory', price: 120, assetKey: 'cup' });
    const hoodieUserItem = await UserItem.create({ user: user._id, item: hoodie._id, equipped: false });
    const glassesUserItem = await UserItem.create({ user: user._id, item: glasses._id, equipped: false });
    const cupUserItem = await UserItem.create({ user: user._id, item: cup._id, equipped: true });

    const response = await request(app)
        .put('/api/inventory/outfit')
        .set('Authorization', authHeader(user))
        .send({ equippedUserItemIds: [hoodieUserItem._id.toString(), glassesUserItem._id.toString()] })
        .expect(200);

    const equippedItems = response.body
        .filter((entry) => entry.equipped)
        .map((entry) => entry.item.assetKey)
        .sort();

    assert.deepEqual(equippedItems, ['glasses', 'hoodie']);
    assert.equal(await UserItem.countDocuments({ _id: cupUserItem._id, equipped: true }), 0);
});

test('save outfit route allows browser PUT preflight', async () => {
    const response = await request(app)
        .options('/api/inventory/outfit')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'PUT')
        .expect(204);

    assert.match(response.headers['access-control-allow-methods'], /\bPUT\b/);
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173');
});

test('save outfit rejects multiple single-equip item types', async () => {
    const user = await buildUser();
    const hoodie = await Item.create({ name: 'Hoodie', type: 'clothing', price: 300, assetKey: 'hoodie' });
    const suit = await Item.create({ name: 'Suit', type: 'clothing', price: 450, assetKey: 'suit' });
    const hoodieUserItem = await UserItem.create({ user: user._id, item: hoodie._id });
    const suitUserItem = await UserItem.create({ user: user._id, item: suit._id });

    const response = await request(app)
        .put('/api/inventory/outfit')
        .set('Authorization', authHeader(user))
        .send({ equippedUserItemIds: [hoodieUserItem._id.toString(), suitUserItem._id.toString()] })
        .expect(400);

    assert.equal(response.body.code, 'OUTFIT_ITEM_TYPE_CONFLICT');
});
