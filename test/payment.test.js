import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import connectDB from '../src/config/database.js';
import {
    grantPremiumBenefitsForBillingPeriod,
    grantPremiumBenefitsFromInvoice,
    grantPremiumCoinsForBillingPeriod,
    grantPremiumShieldsForBillingPeriod,
    markPremiumFromCheckoutSession,
} from '../src/payment/payment.service.js';
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
        streakShields: overrides.streakShields ?? 0,
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

test('checkout completion syncs premium subscription state and grants first billing period benefits', async () => {
    const user = await buildUser({ coins: 25, streakShields: 0, isPremium: false });
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
    assert.equal(upgradedUser.coins, 325);
    assert.equal(upgradedUser.streakShields, 1);
    assert.equal(upgradedUser.coinsLastGrantedPeriodEnd.getTime(), periodEnd * 1000);
    assert.equal(upgradedUser.streakShieldsLastGrantedPeriodEnd.getTime(), periodEnd * 1000);

    const retriedUser = await markPremiumFromCheckoutSession(session);
    assert.equal(retriedUser.isPremium, true);
    assert.equal(retriedUser.coins, 325);
    assert.equal(retriedUser.streakShields, 1);

    const storedUser = await User.findById(user._id).lean();
    assert.equal(storedUser.isPremium, true);
    assert.equal(storedUser.stripeCustomerId, 'cus_test_123');
    assert.equal(storedUser.coins, 325);
    assert.equal(storedUser.streakShields, 1);
});

test('grantPremiumBenefitsForBillingPeriod is idempotent for the same billing period', async () => {
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const user = await buildUser({ coins: 10, streakShields: 2, isPremium: true });

    const firstGrant = await grantPremiumBenefitsForBillingPeriod(user._id, periodEnd);
    assert.equal(firstGrant.coinsGranted, true);
    assert.equal(firstGrant.shieldsGranted, true);

    const reloaded = await User.findById(user._id).lean();
    assert.equal(reloaded.coins, 310);
    assert.equal(reloaded.streakShields, 3);

    const secondGrant = await grantPremiumBenefitsForBillingPeriod(user._id, periodEnd);
    assert.equal(secondGrant.coinsGranted, false);
    assert.equal(secondGrant.shieldsGranted, false);

    const stillReloaded = await User.findById(user._id).lean();
    assert.equal(stillReloaded.coins, 310);
    assert.equal(stillReloaded.streakShields, 3);
});

test('grantPremiumBenefitsForBillingPeriod grants again on renewal billing period', async () => {
    const firstPeriodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const secondPeriodEnd = firstPeriodEnd + 30 * 24 * 60 * 60;
    const user = await buildUser({ coins: 0, streakShields: 0, isPremium: true, stripeCustomerId: 'cus_renew_123' });

    await grantPremiumBenefitsForBillingPeriod(user._id, firstPeriodEnd);

    const renewedGrant = await grantPremiumBenefitsForBillingPeriod(user._id, secondPeriodEnd);
    assert.equal(renewedGrant.coinsGranted, true);
    assert.equal(renewedGrant.shieldsGranted, true);

    const reloaded = await User.findById(user._id).lean();
    assert.equal(reloaded.coins, 600);
    assert.equal(reloaded.streakShields, 2);
    assert.equal(reloaded.coinsLastGrantedPeriodEnd.getTime(), secondPeriodEnd * 1000);
    assert.equal(reloaded.streakShieldsLastGrantedPeriodEnd.getTime(), secondPeriodEnd * 1000);
});

test('grantPremiumBenefitsFromInvoice grants coins and shields for paid subscription invoices', async () => {
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const user = await buildUser({
        coins: 40,
        streakShields: 0,
        isPremium: true,
        stripeCustomerId: 'cus_invoice_123',
    });

    const invoice = {
        status: 'paid',
        billing_reason: 'subscription_cycle',
        customer: 'cus_invoice_123',
        subscription: 'sub_invoice_123',
        lines: {
            data: [
                {
                    period: {
                        end: periodEnd,
                    },
                },
            ],
        },
    };

    const result = await grantPremiumBenefitsFromInvoice(invoice);
    assert.equal(result.coinsGranted, true);
    assert.equal(result.shieldsGranted, true);

    const reloaded = await User.findById(user._id).lean();
    assert.equal(reloaded.coins, 340);
    assert.equal(reloaded.streakShields, 1);
});

test('grantPremiumBenefitsFromInvoice ignores non-subscription invoices', async () => {
    const user = await buildUser({
        coins: 40,
        streakShields: 1,
        isPremium: true,
        stripeCustomerId: 'cus_invoice_456',
    });

    const invoice = {
        status: 'paid',
        billing_reason: 'manual',
        customer: 'cus_invoice_456',
        subscription: null,
        lines: { data: [] },
    };

    const result = await grantPremiumBenefitsFromInvoice(invoice);
    assert.equal(result.coinsGranted, false);
    assert.equal(result.shieldsGranted, false);

    const reloaded = await User.findById(user._id).lean();
    assert.equal(reloaded.coins, 40);
    assert.equal(reloaded.streakShields, 1);
});

test('legacy coin and shield grant helpers delegate to shared billing-period logic', async () => {
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const user = await buildUser({ coins: 0, streakShields: 0, isPremium: true });

    const coinResult = await grantPremiumCoinsForBillingPeriod(user._id, periodEnd);
    assert.equal(coinResult.granted, true);

    const shieldResult = await grantPremiumShieldsForBillingPeriod(user._id, periodEnd);
    assert.equal(shieldResult.granted, false);

    const reloaded = await User.findById(user._id).lean();
    assert.equal(reloaded.coins, 300);
    assert.equal(reloaded.streakShields, 1);
});
