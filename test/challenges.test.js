import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import { getPlanForUser } from '../src/config/plans.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import Challenge from '../src/features/challenges/challenge.model.js';
import ChallengeInvitation from '../src/features/challenges/challengeInvitation.model.js';
import ChallengeParticipant from '../src/features/challenges/challengeParticipant.model.js';
import Habit from '../src/features/habits/habit.model.js';
import { Notification } from '../src/features/notifications/notification.model.js';
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
    if (!overrides.ownerId) {
        throw new Error('ownerId is required for createChallenge test helper');
    }

    const habitTemplate = overrides.habitTemplate || {
        title: overrides.habit?.title || 'Reading',
        description: overrides.habit?.description || '',
        icon: overrides.habit?.icon || 'C',
        type: overrides.habit?.type || 'boolean',
        frequency: overrides.habit?.frequency || 'Daily',
        category: overrides.habit?.category || 'Challenge',
    };
    const requestBody = {
        title: 'Daily Reading',
        habitTemplate,
        description: 'Read a few pages every day',
        frequency: 'daily',
        durationDays: 30,
        ...overrides,
    };

    delete requestBody.habit;
    delete requestBody.habitTemplate.titleOverride;
    delete requestBody.ownerId;

    const response = await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${token}`)
        .send(requestBody)
        .expect(201);

    return response.body.challenge;
}

async function buildFriendship(firstUserId, secondUserId) {
    const [userA, userB] = [firstUserId.toString(), secondUserId.toString()].sort();

    return Friendship.create({ userA, userB });
}

async function buildHabit(ownerId, overrides = {}) {
    return Habit.create({
        title: overrides.title || 'Reading',
        description: overrides.description || '',
        type: overrides.type || 'boolean',
        frequency: overrides.frequency || 'Daily',
        ownerId,
        ...overrides,
    });
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
    await Habit.deleteMany({});
    await Notification.deleteMany({});
    await Friendship.deleteMany({});
    await User.deleteMany({});
});

after(async () => {
    await mongoose.disconnect();

    if (mongo) {
        await mongo.stop();
    }
});

test('POST /api/challenges creates a challenge for a premium user', async () => {
    const owner = await buildUser({ isPremium: true });
    const habit = await buildHabit(owner._id);
    const token = signAccessToken(owner);

    const challenge = await createChallenge(token, {
        habit,
        ownerId: owner._id,
    });

    assert.equal(challenge.title, 'Daily Reading');
    assert.equal(challenge.habitTitle, 'Reading');
    assert.equal(challenge.coinReward, 150);
    assert.equal(challenge.durationDays, 30);
    assert.equal(challenge.status, 'active');
    assert.equal(challenge.participantCount, 1);
    assert.equal(challenge.createdBy, owner._id.toString());
    assert.ok(challenge.startsAt);
    assert.ok(challenge.endsAt);

    const participant = await ChallengeParticipant.findOne({
        challenge: challenge.id,
        user: owner._id,
    });

    const challengeHabit = await Habit.findById(participant.habit);
    assert.equal(challengeHabit.source, 'challenge');
    assert.equal(challengeHabit.title, 'Reading');
});

test('free users cannot create challenges', async () => {
    const user = await buildUser();
    const habit = await buildHabit(user._id);
    const token = signAccessToken(user);

    await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${token}`)
        .send({
            title: 'Free User Challenge',
            habitId: habit._id.toString(),
            frequency: 'daily',
            durationDays: 30,
        })
        .expect(400);
});

test('future challenges are displayed as not started', async () => {
    const owner = await buildUser({ isPremium: true });
    const token = signAccessToken(owner);
    const challenge = await createChallenge(token, {
        ownerId: owner._id,
        habit: await buildHabit(owner._id),
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    assert.equal(challenge.status, 'notStarted');
    assert.equal(challenge.participantCount, 1);
});

test('premium users can create only one active challenge at a time', async () => {
    const owner = await buildUser({ isPremium: true });
    const ownerToken = signAccessToken(owner);
    const firstHabit = await buildHabit(owner._id, { title: 'Reading' });
    const secondHabit = await buildHabit(owner._id, { title: 'Running' });

    await createChallenge(ownerToken, {
        ownerId: owner._id,
        habit: firstHabit,
    });

    await request(app)
        .post('/api/challenges')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
            title: 'Second Challenge',
            habitId: secondHabit._id.toString(),
            frequency: 'daily',
            durationDays: 7,
        })
        .expect(400);
});

test('GET /api/challenges supports active, friends, and public scopes', async () => {
    const owner = await buildUser({ isPremium: true });
    const friend = await buildUser();
    const stranger = await buildUser({ isPremium: true });
    const ownerToken = signAccessToken(owner);
    const friendToken = signAccessToken(friend);
    const friendHabit = await buildHabit(friend._id);

    await buildFriendship(owner._id, friend._id);

    const publicChallenge = await createChallenge(ownerToken, {
        ownerId: owner._id,
        habit: await buildHabit(owner._id),
        title: 'Public Reading',
        visibility: 'public',
    });
    const friendsChallenge = await createChallenge(signAccessToken(stranger), {
        ownerId: stranger._id,
        habit: await buildHabit(stranger._id),
        title: 'Hidden Friend Challenge',
        visibility: 'friends',
    });

    await buildFriendship(stranger._id, friend._id);

    await request(app)
        .post(`/api/challenges/${publicChallenge.id}/join`)
        .set('Authorization', `Bearer ${friendToken}`)
        .send({ habitId: friendHabit._id.toString() })
        .expect(201);

    const activeResponse = await request(app)
        .get('/api/challenges?scope=active')
        .set('Authorization', `Bearer ${friendToken}`)
        .expect(200);

    assert.equal(activeResponse.body.some((challenge) => challenge.id === publicChallenge.id), true);
    assert.equal(
        activeResponse.body.find((challenge) => challenge.id === publicChallenge.id).viewerParticipantStatus,
        'active'
    );

    const friendsResponse = await request(app)
        .get('/api/challenges?scope=friends')
        .set('Authorization', `Bearer ${friendToken}`)
        .expect(200);

    assert.equal(friendsResponse.body.some((challenge) => challenge.id === friendsChallenge.id), true);

    const publicResponse = await request(app)
        .get('/api/challenges?scope=public')
        .set('Authorization', `Bearer ${friendToken}`)
        .expect(200);

    assert.equal(publicResponse.body.some((challenge) => challenge.id === publicChallenge.id), true);
    assert.equal(publicResponse.body.some((challenge) => challenge.id === friendsChallenge.id), false);
    assert.equal(
        publicResponse.body.find((challenge) => challenge.id === publicChallenge.id).viewerParticipantStatus,
        'active'
    );
});

test('GET /api/challenges paginates challenge tabs with limit and offset', async () => {
    const owner = await buildUser({ isPremium: true });
    const viewer = await buildUser();
    const viewerToken = signAccessToken(viewer);
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const challengeDocs = Array.from({ length: 25 }, (_, index) => ({
        createdBy: owner._id,
        title: `Paged Challenge ${index}`,
        habitTitle: `Paged Habit ${index}`,
        habitTemplate: {
            title: `Paged Habit ${index}`,
            icon: 'C',
            type: 'boolean',
            frequency: 'Daily',
            category: 'Challenge',
        },
        description: '',
        coinReward: 50,
        frequency: 'daily',
        durationDays: 10,
        startsAt,
        visibility: 'public',
        status: 'active',
    }));

    await Challenge.create(challengeDocs);

    const firstPage = await request(app)
        .get('/api/challenges?scope=public&limit=20&offset=0')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

    assert.equal(firstPage.body.items.length, 20);
    assert.equal(firstPage.body.hasMore, true);
    assert.equal(firstPage.body.nextOffset, 20);

    const secondPage = await request(app)
        .get('/api/challenges?scope=public&limit=20&offset=20')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

    assert.equal(secondPage.body.items.length, 5);
    assert.equal(secondPage.body.hasMore, false);
    assert.equal(secondPage.body.nextOffset, 25);
});

test('GET /api/challenges?scope=past returns recent ended participations only', async () => {
    const owner = await buildUser({ isPremium: true });
    const ownerToken = signAccessToken(owner);
    const recentStart = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const oldStart = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000);
    const failedStart = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const recentPastChallenge = await createChallenge(ownerToken, {
        ownerId: owner._id,
        habit: await buildHabit(owner._id, { title: 'Recent Past' }),
        title: 'Recent Past',
        startsAt: recentStart.toISOString(),
        durationDays: 7,
    });
    const oldPastChallenge = await createChallenge(ownerToken, {
        ownerId: owner._id,
        habit: await buildHabit(owner._id, { title: 'Old Past' }),
        title: 'Old Past',
        startsAt: oldStart.toISOString(),
        durationDays: 7,
    });
    const leftPastChallenge = await createChallenge(ownerToken, {
        ownerId: owner._id,
        habit: await buildHabit(owner._id, { title: 'Left Past' }),
        title: 'Left Past',
        startsAt: recentStart.toISOString(),
        durationDays: 7,
    });
    const failedChallenge = await createChallenge(ownerToken, {
        ownerId: owner._id,
        habit: await buildHabit(owner._id, { title: 'Failed Past' }),
        title: 'Failed Past',
        startsAt: failedStart.toISOString(),
        durationDays: 30,
    });

    await Promise.all([
        Challenge.updateOne({ _id: failedChallenge.id }, { $set: { status: 'failed' } }),
        ChallengeParticipant.updateOne(
            { challenge: leftPastChallenge.id, user: owner._id },
            { $set: { status: 'left' } },
        ),
    ]);

    const response = await request(app)
        .get('/api/challenges?scope=past')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

    const listedIds = response.body.map((challenge) => challenge.id);

    assert.equal(listedIds.includes(recentPastChallenge.id), true);
    assert.equal(listedIds.includes(failedChallenge.id), true);
    assert.equal(listedIds.includes(oldPastChallenge.id), false);
    assert.equal(listedIds.includes(leftPastChallenge.id), false);
});

test('joining an already joined challenge returns a friendly error', async () => {
    const owner = await buildUser({ isPremium: true });
    const participant = await buildUser();
    const participantToken = signAccessToken(participant);
    const challenge = await createChallenge(signAccessToken(owner), {
        ownerId: owner._id,
        title: 'Already Joined',
    });

    await request(app)
        .post(`/api/challenges/${challenge.id}/join`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({})
        .expect(201);

    const response = await request(app)
        .post(`/api/challenges/${challenge.id}/join`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({})
        .expect(400);

    assert.equal(response.body.code, 'CHALLENGE_ALREADY_JOINED');
    assert.equal(response.body.message, 'You are already participating in this challenge.');
});

test('active challenge scope excludes challenges the user has not joined', async () => {
    const owner = await buildUser({ isPremium: true });
    const viewer = await buildUser();

    await createChallenge(signAccessToken(owner), {
        ownerId: owner._id,
        habit: await buildHabit(owner._id),
        title: 'Not Joined',
        visibility: 'public',
    });

    const activeResponse = await request(app)
        .get('/api/challenges?scope=active')
        .set('Authorization', `Bearer ${signAccessToken(viewer)}`)
        .expect(200);

    assert.deepEqual(activeResponse.body, []);
});

test('challenge details can be edited before start but not after start', async () => {
    const owner = await buildUser({ isPremium: true });
    const ownerToken = signAccessToken(owner);
    const firstHabit = await buildHabit(owner._id, { title: 'Reading' });
    const secondHabit = await buildHabit(owner._id, { title: 'Running' });
    const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const challenge = await createChallenge(ownerToken, {
        ownerId: owner._id,
        habit: firstHabit,
        startsAt,
        durationDays: 10,
    });

    const updateResponse = await request(app)
        .patch(`/api/challenges/${challenge.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
            title: 'Future Running',
            habitTemplate: {
                title: secondHabit.title,
                type: 'boolean',
                frequency: 'Daily',
                category: 'Challenge',
            },
            durationDays: 14,
        })
        .expect(200);

    assert.equal(updateResponse.body.challenge.title, 'Future Running');
    assert.equal(updateResponse.body.challenge.habitTitle, 'Running');
    assert.equal(updateResponse.body.challenge.durationDays, 14);
    assert.equal(updateResponse.body.challenge.coinReward, 70);

    await Challenge.findByIdAndUpdate(challenge.id, { startsAt: new Date(Date.now() - 1000) });

    const lockedResponse = await request(app)
        .patch(`/api/challenges/${challenge.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Too Late' })
        .expect(400);

    assert.equal(lockedResponse.body.code, 'CHALLENGE_EDIT_LOCKED');
});

test('DELETE /api/challenges/:id permanently deletes future own challenges only', async () => {
    const owner = await buildUser({ isPremium: true });
    const invitee = await buildUser();
    const ownerToken = signAccessToken(owner);
    const futureChallenge = await createChallenge(ownerToken, {
        ownerId: owner._id,
        habit: await buildHabit(owner._id, { title: 'Reading' }),
        startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        durationDays: 10,
    });

    await ChallengeInvitation.create({
        challenge: futureChallenge.id,
        inviter: owner._id,
        invitee: invitee._id,
    });

    await request(app)
        .delete(`/api/challenges/${futureChallenge.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

    assert.equal(await Challenge.exists({ _id: futureChallenge.id }), null);
    assert.equal(await ChallengeParticipant.countDocuments({ challenge: futureChallenge.id }), 0);
    assert.equal(await ChallengeInvitation.countDocuments({ challenge: futureChallenge.id }), 0);
    assert.equal(await Habit.countDocuments({ challengeId: futureChallenge.id, source: 'challenge' }), 0);

    const startedChallenge = await createChallenge(ownerToken, {
        ownerId: owner._id,
        habit: await buildHabit(owner._id, { title: 'Running' }),
        startsAt: new Date(Date.now() - 1000).toISOString(),
        durationDays: 10,
    });

    const lockedResponse = await request(app)
        .delete(`/api/challenges/${startedChallenge.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

    assert.equal(lockedResponse.body.code, 'CHALLENGE_DELETE_LOCKED');
    assert.ok(await Challenge.exists({ _id: startedChallenge.id }));
});

test('PATCH /api/challenges clears taxonomy when title or habit template text changes', async () => {
    const owner = await buildUser({ isPremium: true });
    const ownerToken = signAccessToken(owner);
    const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const challenge = await createChallenge(ownerToken, {
        ownerId: owner._id,
        habit: await buildHabit(owner._id, { title: 'Reading' }),
        startsAt,
        durationDays: 10,
    });

    await Challenge.findByIdAndUpdate(challenge.id, {
        $set: {
            taxonomy: {
                categoryKey: 'learning',
                subcategoryKey: 'reading',
                canonicalHabitKey: 'read',
                score: 0.9,
                assignedAt: new Date(),
            },
            'habitTemplate.category': 'Learning',
        },
    });

    const participant = await ChallengeParticipant.findOne({ challenge: challenge.id }).lean();
    await Habit.findByIdAndUpdate(participant.habit, {
        $set: {
            category: 'Learning',
            taxonomy: {
                categoryKey: 'learning',
                subcategoryKey: 'reading',
                canonicalHabitKey: 'read',
                score: 0.9,
                assignedAt: new Date(),
            },
        },
    });

    const updateResponse = await request(app)
        .patch(`/api/challenges/${challenge.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
            title: 'Reading Sprint',
            habitTemplate: {
                title: 'Read 10 pages',
                type: 'boolean',
                frequency: 'Daily',
            },
        })
        .expect(200);

    assert.equal(updateResponse.body.challenge.taxonomy, null);
    assert.equal(updateResponse.body.challenge.habitTemplate.category, null);

    const storedChallenge = await Challenge.findById(challenge.id).lean();
    assert.equal(storedChallenge.taxonomy?.canonicalHabitKey, null);
    assert.equal(storedChallenge.habitTemplate.category, null);

    const storedHabit = await Habit.findById(participant.habit).lean();
    assert.equal(storedHabit.title, 'Read 10 pages');
    assert.equal(storedHabit.category, null);
    assert.equal(storedHabit.taxonomy?.canonicalHabitKey, null);
});

test('PATCH /api/challenges keeps taxonomy when only non-text habit template fields change', async () => {
    const owner = await buildUser({ isPremium: true });
    const ownerToken = signAccessToken(owner);
    const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const challenge = await createChallenge(ownerToken, {
        ownerId: owner._id,
        habit: await buildHabit(owner._id, { title: 'Reading' }),
        startsAt,
        durationDays: 10,
    });

    await Challenge.findByIdAndUpdate(challenge.id, {
        $set: {
            taxonomy: {
                categoryKey: 'learning',
                subcategoryKey: 'reading',
                canonicalHabitKey: 'read',
                score: 0.9,
                assignedAt: new Date(),
            },
            'habitTemplate.category': 'Learning',
        },
    });

    const participant = await ChallengeParticipant.findOne({ challenge: challenge.id }).lean();
    await Habit.findByIdAndUpdate(participant.habit, {
        $set: {
            category: 'Learning',
            taxonomy: {
                categoryKey: 'learning',
                subcategoryKey: 'reading',
                canonicalHabitKey: 'read',
                score: 0.9,
                assignedAt: new Date(),
            },
        },
    });

    const updateResponse = await request(app)
        .patch(`/api/challenges/${challenge.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
            habitTemplate: {
                title: 'Reading',
                description: '',
                icon: '📚',
                type: 'boolean',
                frequency: 'Daily',
            },
        })
        .expect(200);

    assert.equal(updateResponse.body.challenge.taxonomy?.canonicalHabitKey, 'read');
    assert.equal(updateResponse.body.challenge.habitTemplate.category, 'Learning');
    assert.equal(updateResponse.body.challenge.habitTemplate.icon, '📚');

    const storedHabit = await Habit.findById(participant.habit).lean();
    assert.equal(storedHabit.icon, '📚');
    assert.equal(storedHabit.taxonomy?.canonicalHabitKey, 'read');
    assert.equal(storedHabit.category, 'Learning');
});

test('free users can only join two active challenges at a time', async () => {
    const firstOwner = await buildUser({ isPremium: true });
    const secondOwner = await buildUser({ isPremium: true });
    const thirdOwner = await buildUser({ isPremium: true });
    const participant = await buildUser();
    const participantToken = signAccessToken(participant);
    const firstChallenge = await createChallenge(signAccessToken(firstOwner), {
        ownerId: firstOwner._id,
        habit: await buildHabit(firstOwner._id),
        title: 'First Challenge',
    });
    const secondChallenge = await createChallenge(signAccessToken(secondOwner), {
        ownerId: secondOwner._id,
        habit: await buildHabit(secondOwner._id),
        title: 'Second Challenge',
    });
    const thirdChallenge = await createChallenge(signAccessToken(thirdOwner), {
        ownerId: thirdOwner._id,
        habit: await buildHabit(thirdOwner._id),
        title: 'Third Challenge',
    });
    const firstHabit = await buildHabit(participant._id, { title: 'Reading' });
    const secondHabit = await buildHabit(participant._id, { title: 'Running' });
    const thirdHabit = await buildHabit(participant._id, { title: 'Meditation' });

    await request(app)
        .post(`/api/challenges/${firstChallenge.id}/join`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ habitId: firstHabit._id.toString() })
        .expect(201);

    await request(app)
        .post(`/api/challenges/${secondChallenge.id}/join`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ habitId: secondHabit._id.toString() })
        .expect(201);

    await request(app)
        .post(`/api/challenges/${thirdChallenge.id}/join`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ habitId: thirdHabit._id.toString() })
        .expect(400);
});

test('premium users can join active challenges up to their plan limit', async () => {
    const participant = await buildUser({ isPremium: true });
    const participantToken = signAccessToken(participant);
    const maxActiveChallenges = getPlanForUser(participant).limits.maxActiveChallenges;
    const owners = await Promise.all(Array.from(
        { length: maxActiveChallenges + 1 },
        () => buildUser({ isPremium: true })
    ));
    const challenges = [];

    for (const [index, owner] of owners.entries()) {
        challenges.push(await createChallenge(signAccessToken(owner), {
            ownerId: owner._id,
            habit: await buildHabit(owner._id),
            title: `Challenge ${index + 1}`,
        }));
    }

    const habits = await Promise.all(Array.from(
        { length: maxActiveChallenges + 1 },
        (_, index) => buildHabit(participant._id, { title: `Habit ${index + 1}` })
    ));

    for (let index = 0; index < maxActiveChallenges; index += 1) {
        await request(app)
            .post(`/api/challenges/${challenges[index].id}/join`)
            .set('Authorization', `Bearer ${participantToken}`)
            .send({ habitId: habits[index]._id.toString() })
            .expect(201);
    }

    await request(app)
        .post(`/api/challenges/${challenges[maxActiveChallenges].id}/join`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ habitId: habits[maxActiveChallenges]._id.toString() })
        .expect(400);
});

test('challenge participants can join, record progress, and claim prorated rewards', async () => {
    const owner = await buildUser({ isPremium: true });
    const participant = await buildUser();
    const ownerToken = signAccessToken(owner);
    const participantToken = signAccessToken(participant);
    const ownerHabit = await buildHabit(owner._id);
    const habit = await buildHabit(participant._id);
    const challenge = await createChallenge(ownerToken, {
        habit: ownerHabit,
        ownerId: owner._id,
    });

    const joinResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/join`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ habitId: habit._id.toString() })
        .expect(201);

    assert.equal(joinResponse.body.participant.user, participant._id.toString());
    const generatedHabit = await Habit.findById(joinResponse.body.participant.habit);
    assert.equal(generatedHabit.source, 'challenge');
    assert.equal(generatedHabit.ownerId.toString(), participant._id.toString());
    assert.equal(joinResponse.body.participant.daysCompleted, 0);

    const progressResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/progress`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ days: 15 })
        .expect(200);

    assert.equal(progressResponse.body.participant.daysCompleted, 15);
    assert.equal(progressResponse.body.participant.pendingRewardCoins, 75);

    await request(app)
        .patch(`/api/challenges/${challenge.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'completed' })
        .expect(200);

    const rewardResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/reward`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(200);

    assert.equal(rewardResponse.body.rewardCoins, 75);
    assert.equal(rewardResponse.body.participant.rewardClaimed, true);
    assert.equal(rewardResponse.body.participant.rewardCoins, 75);

    const updatedParticipant = await User.findById(participant._id);
    assert.equal(updatedParticipant.coins, 75);
});

test('habit check-in increments linked active challenge progress', async () => {
    const owner = await buildUser({ isPremium: true });
    const participant = await buildUser();
    const ownerToken = signAccessToken(owner);
    const participantToken = signAccessToken(participant);
    const ownerHabit = await buildHabit(owner._id);
    const challenge = await createChallenge(ownerToken, {
        habit: ownerHabit,
        ownerId: owner._id,
    });

    await request(app)
        .post(`/api/challenges/${challenge.id}/join`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({})
        .expect(201);

    const participantRecordBeforeCheckIn = await ChallengeParticipant.findOne({
        challenge: challenge.id,
        user: participant._id,
    });

    await request(app)
        .post(`/api/habits/${participantRecordBeforeCheckIn.habit}/check-ins`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(200);

    const participantRecord = await ChallengeParticipant.findOne({
        challenge: challenge.id,
        user: participant._id,
    });

    assert.equal(participantRecord.daysCompleted, 1);
    assert.ok(participantRecord.lastCompletedAt);
});

test('joining a challenge creates a challenge habit without using normal habit slots', async () => {
    const owner = await buildUser({ isPremium: true });
    const participant = await buildUser();
    const ownerToken = signAccessToken(owner);
    const participantToken = signAccessToken(participant);
    const challenge = await createChallenge(ownerToken, {
        ownerId: owner._id,
        habitTemplate: {
            title: 'Daily Pages',
            type: 'boolean',
            frequency: 'Daily',
            category: 'Learning',
        },
    });

    await Promise.all([
        buildHabit(participant._id, { title: 'Normal Habit 1' }),
        buildHabit(participant._id, { title: 'Normal Habit 2' }),
    ]);

    const joinResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/join`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({})
        .expect(201);

    const challengeHabit = await Habit.findById(joinResponse.body.participant.habit);
    assert.equal(challengeHabit.source, 'challenge');
    assert.equal(challengeHabit.title, 'Daily Pages');
    assert.equal(challengeHabit.challengeId.toString(), challenge.id);

    const habitsResponse = await request(app)
        .get('/api/habits')
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(200);

    assert.equal(habitsResponse.body.data.length, 2);
    assert.equal(habitsResponse.body.data.some((habit) => habit.id === challengeHabit._id.toString()), false);

    const myChallengeHabitsResponse = await request(app)
        .get('/api/challenges/my-habits')
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(200);

    assert.equal(myChallengeHabitsResponse.body.length, 1);
    assert.equal(myChallengeHabitsResponse.body[0].habit.id, challengeHabit._id.toString());
    assert.equal(myChallengeHabitsResponse.body[0].participant.daysCompleted, 0);
});

test('unchecking a challenge habit decrements challenge progress without normal streaks', async () => {
    const owner = await buildUser({ isPremium: true });
    const participant = await buildUser();
    const challenge = await createChallenge(signAccessToken(owner), {
        ownerId: owner._id,
        habitTemplate: {
            title: 'Daily Pages',
            type: 'boolean',
            frequency: 'Daily',
            category: 'Learning',
        },
    });
    const participantToken = signAccessToken(participant);

    const joinResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/join`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({})
        .expect(201);

    await request(app)
        .post(`/api/habits/${joinResponse.body.participant.habit}/check-ins`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(200);

    let participantRecord = await ChallengeParticipant.findOne({
        challenge: challenge.id,
        user: participant._id,
    });
    let challengeHabit = await Habit.findById(joinResponse.body.participant.habit);

    assert.equal(participantRecord.daysCompleted, 1);
    assert.equal(challengeHabit.streakCount, 0);

    await request(app)
        .delete(`/api/habits/${joinResponse.body.participant.habit}/check-ins`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(200);

    participantRecord = await ChallengeParticipant.findOne({
        challenge: challenge.id,
        user: participant._id,
    });
    challengeHabit = await Habit.findById(joinResponse.body.participant.habit);

    assert.equal(participantRecord.daysCompleted, 0);
    assert.equal(challengeHabit.streakCount, 0);
    assert.equal(challengeHabit.lastCompletedAt, null);
});

test('PATCH /api/challenges/:challengeId rejects updates from non-owners', async () => {
    const owner = await buildUser({ isPremium: true });
    const participant = await buildUser();
    const ownerToken = signAccessToken(owner);
    const participantToken = signAccessToken(participant);
    const ownerHabit = await buildHabit(owner._id);
    const challenge = await createChallenge(ownerToken, {
        habit: ownerHabit,
        ownerId: owner._id,
    });

    await request(app)
        .patch(`/api/challenges/${challenge.id}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ title: 'Unauthorized Rename' })
        .expect(403);

    const unchangedChallenge = await Challenge.findById(challenge.id);
    assert.equal(unchangedChallenge.title, 'Daily Reading');
});

test('friend-only challenges are visible and joinable only for friends', async () => {
    const owner = await buildUser({ isPremium: true });
    const friend = await buildUser();
    const stranger = await buildUser();
    const ownerToken = signAccessToken(owner);
    const friendToken = signAccessToken(friend);
    const strangerToken = signAccessToken(stranger);
    const ownerHabit = await buildHabit(owner._id);
    const friendHabit = await buildHabit(friend._id);
    const strangerHabit = await buildHabit(stranger._id);

    await buildFriendship(owner._id, friend._id);

    const challenge = await createChallenge(ownerToken, {
        habit: ownerHabit,
        ownerId: owner._id,
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
        .send({ habitId: strangerHabit._id.toString() })
        .expect(400);

    const joinResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/join`)
        .set('Authorization', `Bearer ${friendToken}`)
        .send({ habitId: friendHabit._id.toString() })
        .expect(201);

    assert.equal(joinResponse.body.participant.user, friend._id.toString());
    const friendChallengeHabit = await Habit.findById(joinResponse.body.participant.habit);
    assert.equal(friendChallengeHabit.source, 'challenge');
    assert.equal(friendChallengeHabit.ownerId.toString(), friend._id.toString());
});

test('public challenges are hidden when either user has blocked the other', async () => {
    const viewer = await buildUser();
    const ownerWhoBlockedViewer = await buildUser({ isPremium: true, blockedUsers: [viewer._id] });
    const ownerBlockedByViewer = await buildUser({ isPremium: true });
    const viewerToken = signAccessToken(viewer);
    const ownerWhoBlockedViewerToken = signAccessToken(ownerWhoBlockedViewer);
    const ownerBlockedByViewerToken = signAccessToken(ownerBlockedByViewer);
    const ownerWhoBlockedHabit = await buildHabit(ownerWhoBlockedViewer._id);
    const ownerBlockedByViewerHabit = await buildHabit(ownerBlockedByViewer._id);
    const viewerHabit = await buildHabit(viewer._id);

    await User.updateOne(
        { _id: viewer._id },
        { $addToSet: { blockedUsers: ownerBlockedByViewer._id } },
    );

    const challengeFromUserWhoBlockedViewer = await createChallenge(ownerWhoBlockedViewerToken, {
        habit: ownerWhoBlockedHabit,
        ownerId: ownerWhoBlockedViewer._id,
        title: 'Hidden Public One',
        visibility: 'public',
    });
    const challengeFromUserBlockedByViewer = await createChallenge(ownerBlockedByViewerToken, {
        habit: ownerBlockedByViewerHabit,
        ownerId: ownerBlockedByViewer._id,
        title: 'Hidden Public Two',
        visibility: 'public',
    });

    const publicListResponse = await request(app)
        .get('/api/challenges?scope=public')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

    assert.equal(
        publicListResponse.body.some((challenge) => challenge.id === challengeFromUserWhoBlockedViewer.id),
        false,
    );
    assert.equal(
        publicListResponse.body.some((challenge) => challenge.id === challengeFromUserBlockedByViewer.id),
        false,
    );

    await request(app)
        .get(`/api/challenges/${challengeFromUserWhoBlockedViewer.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);

    await request(app)
        .post(`/api/challenges/${challengeFromUserBlockedByViewer.id}/join`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ habitId: viewerHabit._id.toString() })
        .expect(400);
});

test('challenge owners can invite friends and invitees can accept to join', async () => {
    const owner = await buildUser({ isPremium: true });
    const friend = await buildUser();
    const ownerToken = signAccessToken(owner);
    const friendToken = signAccessToken(friend);
    const ownerHabit = await buildHabit(owner._id);
    const friendHabit = await buildHabit(friend._id);

    await buildFriendship(owner._id, friend._id);

    const challenge = await createChallenge(ownerToken, {
        habit: ownerHabit,
        ownerId: owner._id,
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
        .send({ habitId: friendHabit._id.toString() })
        .expect(200);

    assert.equal(acceptResponse.body.invitation.status, 'accepted');
    assert.equal(acceptResponse.body.participant.user, friend._id.toString());
    const acceptedChallengeHabit = await Habit.findById(acceptResponse.body.participant.habit);
    assert.equal(acceptedChallengeHabit.source, 'challenge');
    assert.equal(acceptedChallengeHabit.ownerId.toString(), friend._id.toString());

    const participant = await ChallengeParticipant.findOne({
        challenge: challenge.id,
        user: friend._id,
    });
    assert.equal(participant.status, 'active');
    assert.equal(participant.habit.toString(), acceptedChallengeHabit._id.toString());
});

test('challenge invitations create unread bell notifications for invitees', async () => {
    const owner = await buildUser({ isPremium: true });
    const friend = await buildUser();
    const ownerToken = signAccessToken(owner);
    const friendToken = signAccessToken(friend);
    const ownerHabit = await buildHabit(owner._id);

    await buildFriendship(owner._id, friend._id);

    const challenge = await createChallenge(ownerToken, {
        habit: ownerHabit,
        ownerId: owner._id,
    });

    const inviteResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ inviteeId: friend._id.toString() })
        .expect(201);

    const notification = await Notification.findOne({
        recipient: friend._id,
        actor: owner._id,
        type: 'challenge_invitation_received',
        entityType: 'challengeInvitation',
        entityId: inviteResponse.body.invitation.id,
    }).lean();

    assert.ok(notification);
    assert.equal(notification.readAt, null);
    assert.equal(notification.metadata.challengeId, challenge.id);
    assert.equal(notification.metadata.challengeTitle, challenge.title);
});

test('blocking cancels pending challenge invitations and deletes their notifications', async () => {
    const owner = await buildUser({ isPremium: true });
    const friend = await buildUser();
    const ownerToken = signAccessToken(owner);
    const friendToken = signAccessToken(friend);
    const ownerHabit = await buildHabit(owner._id);

    await buildFriendship(owner._id, friend._id);

    const challenge = await createChallenge(ownerToken, {
        habit: ownerHabit,
        ownerId: owner._id,
    });

    await request(app)
        .post(`/api/challenges/${challenge.id}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ inviteeId: friend._id.toString() })
        .expect(201);

    assert.equal(await ChallengeInvitation.countDocuments({ status: 'pending' }), 1);
    assert.equal(await Notification.countDocuments({ type: 'challenge_invitation_received' }), 1);

    const unreadBeforeBlock = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${friendToken}`)
        .expect(200);

    assert.equal(unreadBeforeBlock.body.unreadCount, 1);

    await request(app)
        .post(`/api/social/block/${friend._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

    assert.equal(await Friendship.countDocuments(), 0);
    assert.equal(await ChallengeInvitation.countDocuments({ status: 'pending' }), 0);
    assert.equal(await Notification.countDocuments({ type: 'challenge_invitation_received' }), 0);

    const unreadAfterBlock = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${friendToken}`)
        .expect(200);

    assert.equal(unreadAfterBlock.body.unreadCount, 0);
});

test('blocking keeps existing shared challenge participation active', async () => {
    const owner = await buildUser({ isPremium: true });
    const friend = await buildUser();
    const ownerToken = signAccessToken(owner);
    const friendToken = signAccessToken(friend);
    const ownerHabit = await buildHabit(owner._id);

    await buildFriendship(owner._id, friend._id);

    const challenge = await createChallenge(ownerToken, {
        habit: ownerHabit,
        ownerId: owner._id,
    });

    const inviteResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ inviteeId: friend._id.toString() })
        .expect(201);

    await request(app)
        .post(`/api/challenges/invitations/${inviteResponse.body.invitation.id}/accept`)
        .set('Authorization', `Bearer ${friendToken}`)
        .expect(200);

    await request(app)
        .post(`/api/social/block/${friend._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

    assert.equal(await Friendship.countDocuments(), 0);
    assert.equal(await ChallengeInvitation.countDocuments({ status: 'accepted' }), 1);
    assert.equal(await ChallengeParticipant.countDocuments({ challenge: challenge.id, status: 'active' }), 2);

    const activeListResponse = await request(app)
        .get('/api/challenges?scope=active')
        .set('Authorization', `Bearer ${friendToken}`)
        .expect(200);

    assert.equal(
        activeListResponse.body.some((listedChallenge) => listedChallenge.id === challenge.id),
        true,
    );

    const progressResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/progress`)
        .set('Authorization', `Bearer ${friendToken}`)
        .send({ days: 1 })
        .expect(200);

    assert.equal(progressResponse.body.participant.user, friend._id.toString());
    assert.equal(progressResponse.body.participant.daysCompleted, 1);
});

test('blocked co-invitees can still join and progress in the same challenge', async () => {
    const creator = await buildUser({ isPremium: true });
    const firstInvitee = await buildUser({ blockedUsers: [] });
    const secondInvitee = await buildUser({ blockedUsers: [firstInvitee._id] });
    const creatorToken = signAccessToken(creator);
    const firstInviteeToken = signAccessToken(firstInvitee);
    const secondInviteeToken = signAccessToken(secondInvitee);
    const creatorHabit = await buildHabit(creator._id);

    await Promise.all([
        buildFriendship(creator._id, firstInvitee._id),
        buildFriendship(creator._id, secondInvitee._id),
    ]);

    const challenge = await createChallenge(creatorToken, {
        habit: creatorHabit,
        ownerId: creator._id,
        visibility: 'friends',
    });

    const firstInviteResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/invitations`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ inviteeId: firstInvitee._id.toString() })
        .expect(201);

    const secondInviteResponse = await request(app)
        .post(`/api/challenges/${challenge.id}/invitations`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ inviteeId: secondInvitee._id.toString() })
        .expect(201);

    await request(app)
        .post(`/api/challenges/invitations/${firstInviteResponse.body.invitation.id}/accept`)
        .set('Authorization', `Bearer ${firstInviteeToken}`)
        .expect(200);

    await request(app)
        .post(`/api/challenges/invitations/${secondInviteResponse.body.invitation.id}/accept`)
        .set('Authorization', `Bearer ${secondInviteeToken}`)
        .expect(200);

    assert.equal(await ChallengeParticipant.countDocuments({ challenge: challenge.id, status: 'active' }), 3);

    await request(app)
        .post(`/api/challenges/${challenge.id}/progress`)
        .set('Authorization', `Bearer ${firstInviteeToken}`)
        .send({ days: 1 })
        .expect(200);

    await request(app)
        .post(`/api/challenges/${challenge.id}/progress`)
        .set('Authorization', `Bearer ${secondInviteeToken}`)
        .send({ days: 1 })
        .expect(200);
});

test('unfriending keeps pending challenge invitations and notifications', async () => {
    const owner = await buildUser({ isPremium: true });
    const friend = await buildUser();
    const ownerToken = signAccessToken(owner);
    const ownerHabit = await buildHabit(owner._id);
    const friendship = await buildFriendship(owner._id, friend._id);

    const challenge = await createChallenge(ownerToken, {
        habit: ownerHabit,
        ownerId: owner._id,
    });

    await request(app)
        .post(`/api/challenges/${challenge.id}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ inviteeId: friend._id.toString() })
        .expect(201);

    await request(app)
        .delete(`/api/social/friends/${friendship._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

    assert.equal(await Friendship.countDocuments(), 0);
    assert.equal(await ChallengeInvitation.countDocuments({ status: 'pending' }), 1);
    assert.equal(await Notification.countDocuments({ type: 'challenge_invitation_received' }), 1);
});

test('challenge invitations require creator ownership and friendship', async () => {
    const owner = await buildUser({ isPremium: true });
    const friend = await buildUser();
    const stranger = await buildUser();
    const ownerToken = signAccessToken(owner);
    const friendToken = signAccessToken(friend);
    const ownerHabit = await buildHabit(owner._id);

    await buildFriendship(owner._id, friend._id);

    const challenge = await createChallenge(ownerToken, {
        habit: ownerHabit,
        ownerId: owner._id,
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
    const owner = await buildUser({ isPremium: true });
    const friend = await buildUser();
    const ownerToken = signAccessToken(owner);
    const friendToken = signAccessToken(friend);
    const ownerHabit = await buildHabit(owner._id);

    await buildFriendship(owner._id, friend._id);

    const challenge = await createChallenge(ownerToken, {
        habit: ownerHabit,
        ownerId: owner._id,
    });

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
