import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import connectDB from '../src/config/database.js';
import { markPremiumFromCheckoutSession } from '../src/payment/payment.service.js';
import User from '../src/features/users/user.model.js';
import config from '../config.js';

let mongo;

async function buildUser(overrides = {}) {
    const suffix = Math.random().toString(36).slice(2, 10);

    return User.create({
        username: overrides.username || `payment_user_${suffix}`,
        email: overrides.email || `payment_user_${suffix}@example.com`,
        firstName: overrides.firstName || 'Payment',
        lastName: overrides.lastName || 'User',
        passwordHash: overrides.passwordHash || 'hashed',
        authProvider: overrides.authProvider || 'local',
        coins: overrides.coins ?? 0,
        ...overrides,
    });
}

before(async () => {
    config.jwtSecret = 'test-secret';
    mongo = await MongoMemoryServer.create();
    await connectDB(mongo.getUri());
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

test('checkout completion syncs premium subscription state', async () => {
    const user = await buildUser({ coins: 25, isPremium: false });
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const session = {
        customer: 'cus_test_123',
        metadata: { userId: user._id.toString() },
        subscription: {
            id: 'sub_test_123',
            status: 'active',
            current_period_end: periodEnd,
        },
    };

    const upgradedUser = await markPremiumFromCheckoutSession(session);
    assert.equal(upgradedUser.isPremium, true);
    assert.equal(upgradedUser.stripeCustomerId, 'cus_test_123');
    assert.equal(upgradedUser.stripeSubscriptionId, 'sub_test_123');
    assert.equal(upgradedUser.premiumStatus, 'active');

    const retriedUser = await markPremiumFromCheckoutSession(session);
    assert.equal(retriedUser.isPremium, true);
    assert.equal(retriedUser.coins, 25);

    const storedUser = await User.findById(user._id).lean();
    assert.equal(storedUser.isPremium, true);
    assert.equal(storedUser.stripeCustomerId, 'cus_test_123');
});
