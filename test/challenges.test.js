import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import Challenge from '../src/features/challenges/challenge.model.js';
import ChallengeInvitation from '../src/features/challenges/challengeInvitation.model.js';
import ChallengeParticipant from '../src/features/challenges/challengeParticipant.model.js';
import { Friendship } from '../src/features/social/social.model.js';
import User from '../src/features/users/user.model.js';

let mongo;
let app;

async function buildUser(overrides = {}) {
    const suffix = Math.random().toString(36).slice(2, 10);

    return User.create({
        username: overrides.username || `challenge_user_${suffix}`,
        email: overrides.email || `challenge_user_${suffix}@example.com`,
        firstName: overrides.firstName || 'Challenge',
        lastName: overrides.lastName || 'User',
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

async function buildFriendship(firstUserId, secondUserId) {
    const [userA, userB] = [firstUserId.toString(), secondUserId.toString()].sort();

    return Friendship.create({ userA, userB });
}

before(async () => {
    process.env.JWT_SECRET = 'test-secret';
    mongo = await MongoMemoryServer.create();
    await connectDB(mongo.getUri());
    app = createApp();
});

afterEach(async () => {
    await ChallengeInvitation.deleteMany({});
    await ChallengeParticipant.deleteMany({});
    await Challenge.deleteMany({});
    await Friendship.deleteMany({});
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

test('friend-only challenges are visible and joinable only for friends', async () => {
    const owner = await buildUser();
    const friend = await buildUser();
    const stranger = await buildUser();
    const ownerToken = signAccessToken(owner);
    const friendToken = signAccessToken(friend);
    const strangerToken = signAccessToken(stranger);

    await buildFriendship(owner._id, friend._id);

    const challenge = await createChallenge(ownerToken, {
        title: 'Friends Reading',
        visibility: 'friends',
    });

    const friendListResponse = await request(app)
        .get('/api/challenges')
        .set('Authorization', `Bearer ${friendToken}`)
        .expect(200);

    assert.equal(
        friendListResponse.body.some((listedChallenge) => listedChallenge.id === challenge.id),
        true
    );

    const strangerListResponse = await request(app)
        .get('/api/challenges')
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(200);

    assert.equal(
        strangerListResponse.body.some((listedChallenge) => listedChallenge.id === challenge.id),
        false
    );

    await request(app)
        .post(`/api/challenges/${challenge.id}/join`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(400);

    const joinResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/join`)
        .set('Authorization', `Bearer ${friendToken}`)
        .expect(201);

    assert.equal(joinResponse.body.participant.user, friend._id.toString());
});

test('challenge owners can invite friends and invitees can accept to join', async () => {
    const owner = await buildUser();
    const friend = await buildUser();
    const ownerToken = signAccessToken(owner);
    const friendToken = signAccessToken(friend);

    await buildFriendship(owner._id, friend._id);

    const challenge = await createChallenge(ownerToken, {
        visibility: 'friends',
    });

    const inviteResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ inviteeId: friend._id.toString() })
        .expect(201);

    assert.equal(inviteResponse.body.invitation.invitee, friend._id.toString());
    assert.equal(inviteResponse.body.invitation.status, 'pending');

    const invitationsResponse = await request(app)
        .get('/api/challenges/invitations')
        .set('Authorization', `Bearer ${friendToken}`)
        .expect(200);

    assert.equal(invitationsResponse.body.incoming.length, 1);
    assert.equal(invitationsResponse.body.incoming[0].id, inviteResponse.body.invitation.id);

    const acceptResponse = await request(app)
        .post(`/api/challenges/invitations/${inviteResponse.body.invitation.id}/accept`)
        .set('Authorization', `Bearer ${friendToken}`)
        .expect(200);

    assert.equal(acceptResponse.body.invitation.status, 'accepted');
    assert.equal(acceptResponse.body.participant.user, friend._id.toString());

    const participant = await ChallengeParticipant.findOne({
        challenge: challenge.id,
        user: friend._id,
    });
    assert.equal(participant.status, 'active');
});

test('challenge invitations require creator ownership and friendship', async () => {
    const owner = await buildUser();
    const friend = await buildUser();
    const stranger = await buildUser();
    const ownerToken = signAccessToken(owner);
    const friendToken = signAccessToken(friend);

    await buildFriendship(owner._id, friend._id);

    const challenge = await createChallenge(ownerToken, {
        visibility: 'friends',
    });

    await request(app)
        .post(`/api/challenges/${challenge.id}/invitations`)
        .set('Authorization', `Bearer ${friendToken}`)
        .send({ inviteeId: stranger._id.toString() })
        .expect(403);

    await request(app)
        .post(`/api/challenges/${challenge.id}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ inviteeId: stranger._id.toString() })
        .expect(400);
});

test('rejecting a challenge invitation does not create a participant', async () => {
    const owner = await buildUser();
    const friend = await buildUser();
    const ownerToken = signAccessToken(owner);
    const friendToken = signAccessToken(friend);

    await buildFriendship(owner._id, friend._id);

    const challenge = await createChallenge(ownerToken);

    const inviteResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ inviteeId: friend._id.toString() })
        .expect(201);

    const rejectResponse = await request(app)
        .post(`/api/challenges/invitations/${inviteResponse.body.invitation.id}/reject`)
        .set('Authorization', `Bearer ${friendToken}`)
        .expect(200);

    assert.equal(rejectResponse.body.invitation.status, 'rejected');

    const participant = await ChallengeParticipant.findOne({
        challenge: challenge.id,
        user: friend._id,
    });
    assert.equal(participant, null);
});
