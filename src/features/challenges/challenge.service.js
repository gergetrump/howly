import Challenge from './challenge.model.js';
import ChallengeParticipant from './challengeParticipant.model.js';
import User from '../users/user.model.js';
import { Friendship } from '../social/social.model.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function calculateEndDate(startsAt, durationDays) {
    return new Date(startsAt.getTime() + durationDays * DAY_IN_MS);
}

function isChallengeOwner(challenge, user) {
    return challenge.createdBy.toString() === user.id || user.role === 'admin';
}

function sameId(firstId, secondId) {
    return firstId?.toString() === secondId?.toString();
}

function buildFriendshipPair(firstUserId, secondUserId) {
    const [userA, userB] = [firstUserId.toString(), secondUserId.toString()].sort();
    return { userA, userB };
}

async function areFriends(firstUserId, secondUserId) {
    const friendship = await Friendship.findOne(buildFriendshipPair(firstUserId, secondUserId)).lean();

    return Boolean(friendship);
}

async function getFriendIds(userId) {
    const friendships = await Friendship.find({
        $or: [{ userA: userId }, { userB: userId }],
    }).lean();

    return friendships.map((friendship) => (
        sameId(friendship.userA, userId) ? friendship.userB : friendship.userA
    ));
}

async function canViewChallenge(challenge, user) {
    if (challenge.visibility === 'public' || isChallengeOwner(challenge, user)) {
        return true;
    }

    return areFriends(user.id, challenge.createdBy);
}

function canCreateChallenge() {
    // TODO: replace with a real premium/subscription check once User has that field.
    return true;
}

function getRewardCoins(challenge, participant) {
    const cappedDays = Math.min(participant.daysCompleted, challenge.durationDays);
    const progressRatio = cappedDays / challenge.durationDays;

    return Math.floor(challenge.coinReward * progressRatio);
}

function isRewardClaimable(challenge, now = new Date()) {
    return challenge.status === 'completed' || challenge.endsAt <= now;
}

function serializeChallenge(challenge) {
    if (!challenge) {
        return null;
    }

    return {
        id: challenge._id.toString(),
        createdBy: challenge.createdBy.toString(),
        title: challenge.title,
        habitTitle: challenge.habitTitle,
        description: challenge.description,
        coinReward: challenge.coinReward,
        frequency: challenge.frequency,
        durationDays: challenge.durationDays,
        startsAt: challenge.startsAt,
        endsAt: challenge.endsAt,
        status: challenge.status,
        visibility: challenge.visibility,
        createdAt: challenge.createdAt,
        updatedAt: challenge.updatedAt,
    };
}

function serializeParticipant(participant, challenge) {
    if (!participant) {
        return null;
    }

    return {
        id: participant._id.toString(),
        challenge: participant.challenge.toString(),
        user: participant.user.toString(),
        status: participant.status,
        joinedAt: participant.joinedAt,
        daysCompleted: participant.daysCompleted,
        lastCompletedAt: participant.lastCompletedAt,
        rewardClaimed: participant.rewardClaimed,
        rewardClaimedAt: participant.rewardClaimedAt,
        rewardCoins: participant.rewardCoins,
        pendingRewardCoins: challenge ? getRewardCoins(challenge, participant) : undefined,
        createdAt: participant.createdAt,
        updatedAt: participant.updatedAt,
    };
}

export async function createChallenge(input, user) {
    if (!canCreateChallenge(user)) {
        return { error: 'premium membership is required to create challenges' };
    }

    const startsAt = input.startsAt || new Date();
    const challenge = await Challenge.create({
        ...input,
        createdBy: user.id,
        startsAt,
        endsAt: calculateEndDate(startsAt, input.durationDays),
    });

    return { challenge: serializeChallenge(challenge) };
}

export async function listChallenges(filters = {}, user) {
    const conditions = [];

    if (filters.status) {
        conditions.push({ status: filters.status });
    }

    if (filters.createdBy) {
        conditions.push({ createdBy: filters.createdBy });
    }

    if (filters.visibility) {
        conditions.push({ visibility: filters.visibility });
    }

    if (filters.mine) {
        conditions.push({ createdBy: user.id });
    } else if (user.role !== 'admin') {
        const friendIds = await getFriendIds(user.id);

        conditions.push({
            $or: [
                { visibility: 'public' },
                { createdBy: user.id },
                { visibility: 'friends', createdBy: { $in: friendIds } },
            ],
        });
    }

    const query = conditions.length ? { $and: conditions } : {};
    const challenges = await Challenge.find(query).sort({ createdAt: -1 });

    return challenges.map(serializeChallenge);
}

export async function getChallengeById(challengeId, user) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    if (!await canViewChallenge(challenge, user)) {
        return { forbidden: true };
    }

    return { challenge: serializeChallenge(challenge) };
}

export async function updateChallenge(challengeId, updates, user) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    if (!isChallengeOwner(challenge, user)) {
        return { forbidden: true };
    }

    const nextStartsAt = updates.startsAt || challenge.startsAt;
    const nextDurationDays = updates.durationDays || challenge.durationDays;

    Object.assign(challenge, updates, {
        endsAt: calculateEndDate(nextStartsAt, nextDurationDays),
    });

    await challenge.save();

    return { challenge: serializeChallenge(challenge) };
}

export async function deleteChallenge(challengeId, user) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    if (!isChallengeOwner(challenge, user)) {
        return { forbidden: true };
    }

    await ChallengeParticipant.deleteMany({ challenge: challengeId });
    await Challenge.findByIdAndDelete(challengeId);

    return { challenge: serializeChallenge(challenge) };
}

export async function joinChallenge(challengeId, user) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    if (!await canViewChallenge(challenge, user)) {
        return { error: 'user must be friends with the challenge creator to join this challenge' };
    }

    if (challenge.status === 'completed' || challenge.status === 'failed' || challenge.endsAt <= new Date()) {
        return { error: 'challenge is no longer joinable' };
    }

    const existingParticipant = await ChallengeParticipant.findOne({
        challenge: challengeId,
        user: user.id,
    });

    if (existingParticipant && existingParticipant.status !== 'left') {
        return { error: 'user already joined this challenge' };
    }

    if (existingParticipant) {
        existingParticipant.status = 'active';
        existingParticipant.joinedAt = new Date();
        existingParticipant.daysCompleted = 0;
        existingParticipant.lastCompletedAt = null;
        existingParticipant.rewardClaimed = false;
        existingParticipant.rewardClaimedAt = null;
        existingParticipant.rewardCoins = 0;
        await existingParticipant.save();

        return {
            challenge: serializeChallenge(challenge),
            participant: serializeParticipant(existingParticipant, challenge),
        };
    }

    const participant = await ChallengeParticipant.create({
        challenge: challengeId,
        user: user.id,
    });

    return {
        challenge: serializeChallenge(challenge),
        participant: serializeParticipant(participant, challenge),
    };
}

export async function leaveChallenge(challengeId, userId) {
    const participant = await ChallengeParticipant.findOneAndUpdate(
        { challenge: challengeId, user: userId, status: 'active' },
        { status: 'left' },
        { new: true }
    );

    if (!participant) {
        return { notFound: true };
    }

    const challenge = await Challenge.findById(challengeId);

    return {
        challenge: serializeChallenge(challenge),
        participant: serializeParticipant(participant, challenge),
    };
}

export async function listParticipants(challengeId, user) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    if (!await canViewChallenge(challenge, user)) {
        return { forbidden: true };
    }

    const participants = await ChallengeParticipant.find({ challenge: challengeId }).sort({ joinedAt: 1 });

    return {
        challenge: serializeChallenge(challenge),
        participants: participants.map((participant) => serializeParticipant(participant, challenge)),
    };
}

export async function recordProgress(challengeId, userId, { days }) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    const participant = await ChallengeParticipant.findOne({
        challenge: challengeId,
        user: userId,
        status: 'active',
    });

    if (!participant) {
        return { error: 'user is not an active participant of this challenge' };
    }

    participant.daysCompleted = Math.min(participant.daysCompleted + days, challenge.durationDays);
    participant.lastCompletedAt = new Date();

    if (participant.daysCompleted >= challenge.durationDays) {
        participant.status = 'completed';
    }

    await participant.save();

    return {
        challenge: serializeChallenge(challenge),
        participant: serializeParticipant(participant, challenge),
    };
}

export async function claimReward(challengeId, userId) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    const participant = await ChallengeParticipant.findOne({
        challenge: challengeId,
        user: userId,
    });

    if (!participant) {
        return { error: 'user has not joined this challenge' };
    }

    if (participant.rewardClaimed) {
        return { error: 'reward has already been claimed' };
    }

    if (!isRewardClaimable(challenge)) {
        return { error: 'reward can only be claimed after the challenge ends' };
    }

    const rewardCoins = getRewardCoins(challenge, participant);

    await User.findByIdAndUpdate(userId, { $inc: { coins: rewardCoins } });

    participant.rewardClaimed = true;
    participant.rewardClaimedAt = new Date();
    participant.rewardCoins = rewardCoins;
    await participant.save();

    return {
        challenge: serializeChallenge(challenge),
        participant: serializeParticipant(participant, challenge),
        rewardCoins,
    };
}
