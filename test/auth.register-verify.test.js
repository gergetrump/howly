import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import User from '../src/features/users/user.model.js';
import config from '../config.js';
import { registerLocalUser } from '../src/features/auth/auth.service.js';

let mongo;
let app;
let originalDisableEmailSending;

before(async () => {
    config.jwtSecret = 'test-secret';
    originalDisableEmailSending = config.disableEmailSending;
    config.disableEmailSending = true;
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
    config.disableEmailSending = originalDisableEmailSending;
});

test('registering sends a pending account that requires email confirmation', async () => {
    const { user, verificationToken } = await registerLocalUser({
        username: 'new-user',
        email: 'new-user@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'password123',
    });

    assert.equal(user.isEmailVerified, false);
    assert.ok(verificationToken);

    await request(app)
        .post('/api/auth/login')
        .send({ email: 'new-user@example.com', password: 'password123' })
        .expect(403);

    const confirmResponse = await request(app)
        .get('/api/auth/verify-email')
        .query({ token: verificationToken })
        .expect(200);

    assert.equal(confirmResponse.body.user.email, 'new-user@example.com');
    assert.equal(confirmResponse.body.user.isEmailVerified, true);

    const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'new-user@example.com', password: 'password123' })
        .expect(200);

    assert.ok(loginResponse.body.token);
    assert.equal(loginResponse.body.user.isEmailVerified, true);
});

test('browser verification requests receive an HTML confirmation page', async () => {
    const { verificationToken } = await registerLocalUser({
        username: 'browser-user',
        email: 'browser-user@example.com',
        firstName: 'Browser',
        lastName: 'User',
        password: 'password123',
    });

    const response = await request(app)
        .get('/api/auth/verify-email')
        .query({ token: verificationToken, view: 'web' })
        .expect(200);

    assert.match(response.headers['content-type'], /text\/html/);
    assert.match(response.text, /Email verified successfully/);
    assert.match(response.text, /Continue to sign in/);
});

test('expired verification tokens can be replaced with a new verification email', async () => {
    const { user, verificationToken } = await registerLocalUser({
        username: 'expired-user',
        email: 'expired-user@example.com',
        firstName: 'Expired',
        lastName: 'User',
        password: 'password123',
    });

    await User.findByIdAndUpdate(user._id, {
        emailVerificationExpiresAt: new Date(Date.now() - 60 * 1000),
    });

    await request(app)
        .get('/api/auth/verify-email')
        .query({ token: verificationToken })
        .expect(400);

    const beforeResend = await User.findById(user._id).lean();

    await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'expired-user@example.com' })
        .expect(200);

    const afterResend = await User.findById(user._id).lean();

    assert.notEqual(afterResend.emailVerificationTokenHash, beforeResend.emailVerificationTokenHash);
    assert.ok(afterResend.emailVerificationExpiresAt > beforeResend.emailVerificationExpiresAt);
});