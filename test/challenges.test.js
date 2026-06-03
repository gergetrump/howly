import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import challengeRoutes from '../src/features/challenges/challenge.routes.js';
import Challenge from '../src/features/challenges/challenge.model.js';
import ChallengeParticipant from '../src/features/challenges/challengeParticipant.model.js';
import User from '../src/features/users/user.model.js';

let mongo;
let app;

async function buildUser(overrides = {}) {
    const suffix = Math.random().toString(36).slice(2, 10);

    return User.create({
        username: overrides.username || `challenge_user_${suffix}`,
        email: overrides.email || `challenge_user_${suffix}@example.com`,
        fullName: overrides.fullName || 'Challenge User',
        passwordHash: overrides.passwordHash || 'hashed',
        authProvider: overrides.authProvider || 'local',
        coins: overrides.coins || 0,
        ...overrides,
    });
}

async function createChallenge(token, overrides = {}) {
    const response = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${token}`)
        .send({
            title: 'Daily Reading',
            habitTitle: 'Reading',
            description: 'Read a few pages every day',
            coinReward: 300,
            frequency: 'daily',
            durationDays: 30,
            ...overrides,
        })
        .expect(201);

    return response.body.challenge;
}

before(async () => {
    process.env.JWT_SECRET = 'test-secret';
    mongo = await MongoMemoryServer.create();
    await connectDB(mongo.getUri());
    app = createApp();
    app.use('/api/challenges', challengeRoutes);
});

afterEach(async () => {
    await ChallengeParticipant.deleteMany({});
    await Challenge.deleteMany({});
    await User.deleteMany({});
});

after(async () => {
    await mongoose.disconnect();

    if (mongo) {
        await mongo.stop();
    }
});

test('POST /api/challenges creates a challenge for an authenticated user', async () => {
    const owner = await buildUser();
    const token = signAccessToken(owner);

    const challenge = await createChallenge(token);

    assert.equal(challenge.title, 'Daily Reading');
    assert.equal(challenge.habitTitle, 'Reading');
    assert.equal(challenge.coinReward, 300);
    assert.equal(challenge.durationDays, 30);
    assert.equal(challenge.createdBy, owner._id.toString());
    assert.ok(challenge.startsAt);
    assert.ok(challenge.endsAt);
});

test('challenge participants can join, record progress, and claim prorated rewards', async () => {
    const owner = await buildUser();
    const participant = await buildUser();
    const ownerToken = signAccessToken(owner);
    const participantToken = signAccessToken(participant);
    const challenge = await createChallenge(ownerToken);

    const joinResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/join`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(201);

    assert.equal(joinResponse.body.participant.user, participant._id.toString());
    assert.equal(joinResponse.body.participant.daysCompleted, 0);

    const progressResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/progress`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ days: 15 })
        .expect(200);

    assert.equal(progressResponse.body.participant.daysCompleted, 15);
    assert.equal(progressResponse.body.participant.pendingRewardCoins, 150);

    await request(app)
        .patch(`/api/challenges/${challenge.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'completed' })
        .expect(200);

    const rewardResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/reward`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(200);

    assert.equal(rewardResponse.body.rewardCoins, 150);
    assert.equal(rewardResponse.body.participant.rewardClaimed, true);
    assert.equal(rewardResponse.body.participant.rewardCoins, 150);

    const updatedParticipant = await User.findById(participant._id);
    assert.equal(updatedParticipant.coins, 150);
});

test('PATCH /api/challenges/:challengeId rejects updates from non-owners', async () => {
    const owner = await buildUser();
    const participant = await buildUser();
    const ownerToken = signAccessToken(owner);
    const participantToken = signAccessToken(participant);
    const challenge = await createChallenge(ownerToken);

    await request(app)
        .patch(`/api/challenges/${challenge.id}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ title: 'Unauthorized Rename' })
        .expect(403);

    const unchangedChallenge = await Challenge.findById(challenge.id);
    assert.equal(unchangedChallenge.title, 'Daily Reading');
});
