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

test('buying an item stores the selected customization on the inventory entry', async () => {
    const user = await buildUser({ coins: 1000 });
    const item = await buildItem({ type: 'clothing', assetKey: 'hoodie', price: 100 });
    const customization = {
        color: '#4f772d',
        stringColor: '#f8fafc',
        textColor: '#111827',
        text: 'forest howly',
    };

    const response = await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({ itemId: item._id.toString(), customization })
        .expect(201);

    assert.deepEqual(response.body.customization, {
        color: '#4F772D',
        stringColor: '#F8FAFC',
        textColor: '#111827',
        text: 'FOREST HOWLY',
    });

    const userItem = await UserItem.findOne({ user: user._id, item: item._id }).lean();

    assert.deepEqual(userItem.customization, response.body.customization);

    const inventoryResponse = await request(app)
        .get('/api/inventory/me')
        .set('Authorization', authHeader(user))
        .expect(200);

    assert.deepEqual(inventoryResponse.body[0].customization, response.body.customization);
});

test('users can own the same hoodie with different customizations', async () => {
    const user = await buildUser({ coins: 1000 });
    const item = await buildItem({ type: 'clothing', assetKey: 'hoodie', price: 100 });

    await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({
            itemId: item._id.toString(),
            customization: {
                color: '#C66E6E',
                stringColor: '#DADADA',
                textColor: '#FFFFFF',
                text: 'HOWLY',
            },
        })
        .expect(201);

    await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({
            itemId: item._id.toString(),
            customization: {
                color: '#4F772D',
                stringColor: '#F8FAFC',
                textColor: '#111827',
                text: 'FOREST',
            },
        })
        .expect(201);

    assert.equal(await UserItem.countDocuments({ user: user._id, item: item._id }), 2);

    const updatedUser = await User.findById(user._id).lean();

    assert.equal(updatedUser.coins, 800);
});

test('users cannot buy the same hoodie customization twice', async () => {
    const user = await buildUser({ coins: 1000 });
    const item = await buildItem({ type: 'clothing', assetKey: 'hoodie', price: 100 });
    const customization = {
        color: '#4F772D',
        stringColor: '#F8FAFC',
        textColor: '#111827',
        text: 'FOREST',
    };

    await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({ itemId: item._id.toString(), customization })
        .expect(201);

    const response = await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({ itemId: item._id.toString(), customization })
        .expect(409);

    assert.equal(response.body.code, 'ITEM_ALREADY_OWNED');
    assert.equal(await UserItem.countDocuments({ user: user._id, item: item._id }), 1);

    const updatedUser = await User.findById(user._id).lean();

    assert.equal(updatedUser.coins, 900);
});

test('users can own different customizations for other customizable clothing items', async () => {
    const user = await buildUser({ coins: 1000 });
    const top = await buildItem({ type: 'clothing', assetKey: 'cream-top', price: 100 });

    await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({
            itemId: top._id.toString(),
            customization: {
                color: '#F4EFE5',
                buttonColor: '#B18167',
                pocketColor: '#DDCEAF',
            },
        })
        .expect(201);

    const secondResponse = await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({
            itemId: top._id.toString(),
            customization: {
                color: '#DBEAFE',
                buttonColor: '#1D4ED8',
                pocketColor: '#93C5FD',
            },
        })
        .expect(201);

    assert.deepEqual(secondResponse.body.customization, {
        color: '#DBEAFE',
        buttonColor: '#1D4ED8',
        pocketColor: '#93C5FD',
    });
    assert.equal(await UserItem.countDocuments({ user: user._id, item: top._id }), 2);
});

test('users can own customized accessories and shoes', async () => {
    const user = await buildUser({ coins: 1000 });
    const phone = await buildItem({ type: 'accessory', assetKey: 'phone', price: 100 });
    const cup = await buildItem({ type: 'accessory', assetKey: 'cup', price: 100 });
    const sneaker = await buildItem({ type: 'shoes', assetKey: 'sneaker', price: 100 });

    const phoneResponse = await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({
            itemId: phone._id.toString(),
            customization: {
                frameColor: '#DBEAFE',
                backgroundColor: '#111827',
                side: 'left',
            },
        })
        .expect(201);

    const cupResponse = await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({
            itemId: cup._id.toString(),
            customization: {
                color: '#E09AAB',
                symbol: 'heart',
                symbolColor: '#3B82F6',
                side: 'right',
            },
        })
        .expect(201);

    const sneakerResponse = await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({
            itemId: sneaker._id.toString(),
            customization: {
                color: '#1D4ED8',
            },
        })
        .expect(201);

    assert.deepEqual(phoneResponse.body.customization, {
        frameColor: '#DBEAFE',
        backgroundColor: '#111827',
        side: 'left',
    });
    assert.deepEqual(cupResponse.body.customization, {
        color: '#E09AAB',
        symbol: 'heart',
        symbolColor: '#3B82F6',
        side: 'right',
    });
    assert.deepEqual(sneakerResponse.body.customization, {
        color: '#1D4ED8',
    });
    assert.equal(await UserItem.countDocuments({ user: user._id }), 3);
});

test('users can own the same cup symbol with different colors', async () => {
    const user = await buildUser({ coins: 1000 });
    const cup = await buildItem({ type: 'accessory', assetKey: 'cup', price: 100 });

    await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({
            itemId: cup._id.toString(),
            customization: {
                color: '#E09AAB',
                symbol: 'heart',
                symbolColor: '#990000',
            },
        })
        .expect(201);

    await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({
            itemId: cup._id.toString(),
            customization: {
                color: '#E09AAB',
                symbol: 'heart',
                symbolColor: '#3B82F6',
            },
        })
        .expect(201);

    assert.equal(await UserItem.countDocuments({ user: user._id, item: cup._id }), 2);
});

test('users cannot buy the same accessory customization twice by changing only side', async () => {
    const user = await buildUser({ coins: 1000 });
    const cup = await buildItem({ type: 'accessory', assetKey: 'cup', price: 100 });

    await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({
            itemId: cup._id.toString(),
            customization: {
                color: '#E09AAB',
                side: 'right',
            },
        })
        .expect(201);

    await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({
            itemId: cup._id.toString(),
            customization: {
                color: '#E09AAB',
                side: 'left',
            },
        })
        .expect(409);

    assert.equal(await UserItem.countDocuments({ user: user._id, item: cup._id }), 1);
});

test('saving an outfit persists accessory side placement', async () => {
    const user = await buildUser({ coins: 1000 });
    const cup = await buildItem({ type: 'accessory', assetKey: 'cup', price: 100 });

    const buyResponse = await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({
            itemId: cup._id.toString(),
            customization: {
                color: '#E09AAB',
                side: 'right',
            },
        })
        .expect(201);

    const userItemId = buyResponse.body._id;

    const response = await request(app)
        .put('/api/inventory/outfit')
        .set('Authorization', authHeader(user))
        .send({
            equippedUserItemIds: [userItemId],
            customizationUpdates: {
                [userItemId]: {
                    side: 'left',
                    color: '#000000',
                },
            },
        })
        .expect(200);

    assert.equal(response.body[0].equipped, true);
    assert.deepEqual(response.body[0].customization, {
        color: '#E09AAB',
        symbol: 'eclipse',
        symbolColor: '#FFFF00',
        side: 'left',
    });
});

test('saving an outfit rejects two items in the same single accessory slot', async () => {
    const user = await buildUser({ coins: 1000 });
    const necklace = await buildItem({ type: 'accessory', assetKey: 'necklace', price: 100 });
    const sakuraNecklace = await buildItem({ type: 'accessory', assetKey: 'sakura-neckclace', price: 100 });
    const [necklaceEntry, sakuraEntry] = await UserItem.create([
        { user: user._id, item: necklace._id },
        { user: user._id, item: sakuraNecklace._id },
    ]);

    const response = await request(app)
        .put('/api/inventory/outfit')
        .set('Authorization', authHeader(user))
        .send({
            equippedUserItemIds: [
                necklaceEntry._id.toString(),
                sakuraEntry._id.toString(),
            ],
        })
        .expect(400);

    assert.equal(response.body.code, 'OUTFIT_ITEM_TYPE_CONFLICT');
});

test('saving an outfit rejects two head accessories', async () => {
    const user = await buildUser({ coins: 1000 });
    const warmHat = await buildItem({ type: 'accessory', assetKey: 'warm-hat', price: 100 });
    const cuteHat = await buildItem({ type: 'accessory', assetKey: 'cute-hat', price: 100 });
    const [warmHatEntry, cuteHatEntry] = await UserItem.create([
        { user: user._id, item: warmHat._id },
        { user: user._id, item: cuteHat._id },
    ]);

    const response = await request(app)
        .put('/api/inventory/outfit')
        .set('Authorization', authHeader(user))
        .send({
            equippedUserItemIds: [
                warmHatEntry._id.toString(),
                cuteHatEntry._id.toString(),
            ],
        })
        .expect(400);

    assert.equal(response.body.code, 'OUTFIT_ITEM_TYPE_CONFLICT');
});

test('saving an outfit allows slotless accessories like scar to stack', async () => {
    const user = await buildUser({ coins: 1000 });
    const glasses = await buildItem({ type: 'accessory', assetKey: 'glasses', price: 100 });
    const scar = await buildItem({ type: 'accessory', assetKey: 'scar', price: 100 });
    const [glassesEntry, scarEntry] = await UserItem.create([
        { user: user._id, item: glasses._id },
        { user: user._id, item: scar._id },
    ]);

    const response = await request(app)
        .put('/api/inventory/outfit')
        .set('Authorization', authHeader(user))
        .send({
            equippedUserItemIds: [
                glassesEntry._id.toString(),
                scarEntry._id.toString(),
            ],
        })
        .expect(200);

    const equippedIds = new Set(
        response.body
            .filter((entry) => entry.equipped)
            .map((entry) => entry._id),
    );

    assert.equal(equippedIds.has(glassesEntry._id.toString()), true);
    assert.equal(equippedIds.has(scarEntry._id.toString()), true);
});

test('legacy side-based accessory entries still count as owned', async () => {
    const user = await buildUser({ coins: 1000 });
    const cup = await buildItem({ type: 'accessory', assetKey: 'cup', price: 100 });
    const legacyCustomization = {
        color: '#E09AAB',
        side: 'right',
    };

    await UserItem.create({
        user: user._id,
        item: cup._id,
        customization: legacyCustomization,
        customizationKey: JSON.stringify(legacyCustomization),
    });

    await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({
            itemId: cup._id.toString(),
            customization: {
                color: '#E09AAB',
                side: 'left',
            },
        })
        .expect(409);

    assert.equal(await UserItem.countDocuments({ user: user._id, item: cup._id }), 1);
});

test('legacy customizable inventory entries count as the default customization', async () => {
    const user = await buildUser({ coins: 1000 });
    const hoodie = await buildItem({ type: 'clothing', assetKey: 'hoodie', price: 100 });

    await UserItem.create({
        user: user._id,
        item: hoodie._id,
    });

    await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({ itemId: hoodie._id.toString() })
        .expect(409);

    await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', authHeader(user))
        .send({
            itemId: hoodie._id.toString(),
            customization: {
                color: '#4F772D',
                stringColor: '#F8FAFC',
                textColor: '#111827',
                text: 'FOREST',
            },
        })
        .expect(201);

    assert.equal(await UserItem.countDocuments({ user: user._id, item: hoodie._id }), 2);
});
