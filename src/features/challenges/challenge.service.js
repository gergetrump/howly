import Challenge from './challenge.model.js';
import ChallengeInvitation from './challengeInvitation.model.js';
import ChallengeParticipant from './challengeParticipant.model.js';
import Habit from '../habits/habit.model.js';
import User from '../users/user.model.js';
import { Friendship } from '../social/social.model.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const COINS_PER_CHALLENGE_DAY = 5;
const FREE_ACTIVE_CHALLENGE_LIMIT = 1;
const PREMIUM_ACTIVE_CHALLENGE_LIMIT = 2;
const MAX_ACTIVE_CREATED_CHALLENGES = 1;

function calculateEndDate(startsAt, durationDays) {
    return new Date(startsAt.getTime() + durationDays * DAY_IN_MS);
}

function getCoinReward(durationDays) {
    return durationDays * COINS_PER_CHALLENGE_DAY;
}

function isChallengeOwner(challenge, user) {
    return challenge.createdBy.toString() === user.id || user.role === 'admin';
}

function isChallengeCreator(challenge, user) {
    return challenge.createdBy.toString() === user.id;
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

async function getOwnedHabit(habitId, userId) {
    return Habit.findOne({ _id: habitId, ownerId: userId }).lean();
}

function hasPremiumMembership(user) {
    // TODO: replace these placeholder checks with the real premium/subscription field once User has it.
    return user.role === 'admin'
        || user.isPremium === true
        || user.premium === true
        || user.subscriptionTier === 'premium'
        || user.plan === 'premium';
}

function getActiveChallengeLimit(user) {
    return hasPremiumMembership(user) ? PREMIUM_ACTIVE_CHALLENGE_LIMIT : FREE_ACTIVE_CHALLENGE_LIMIT;
}

function getActiveChallengeConditions(now = new Date()) {
    return {
        status: { $nin: ['completed', 'failed'] },
        endsAt: { $gt: now },
    };
}

async function getActiveChallengeIdsForUser(userId, now = new Date()) {
    const activeChallengeConditions = getActiveChallengeConditions(now);
    const activeParticipations = await ChallengeParticipant.find({
        user: userId,
        status: 'active',
    }).select('challenge').lean();

    const participantChallengeIds = activeParticipations.map((participant) => participant.challenge);

    const [createdChallenges, joinedChallenges] = await Promise.all([
        Challenge.find({
            createdBy: userId,
            ...activeChallengeConditions,
        }).select('_id').lean(),
        participantChallengeIds.length
            ? Challenge.find({
                _id: { $in: participantChallengeIds },
                ...activeChallengeConditions,
            }).select('_id').lean()
            : [],
    ]);

    return new Set([
        ...createdChallenges.map((challenge) => challenge._id.toString()),
        ...joinedChallenges.map((challenge) => challenge._id.toString()),
    ]);
}

async function getActiveCreatedChallengeCount(userId, now = new Date()) {
    return Challenge.countDocuments({
        createdBy: userId,
        ...getActiveChallengeConditions(now),
    });
}

async function canAddActiveChallenge(user, challengeId) {
    const activeChallengeIds = await getActiveChallengeIdsForUser(user.id);
    const activeChallengeLimit = getActiveChallengeLimit(user);

    if (challengeId) {
        activeChallengeIds.add(challengeId.toString());
    }

    return activeChallengeIds.size <= activeChallengeLimit;
}

async function canCreateChallenge(user) {
    if (!hasPremiumMembership(user)) {
        return { error: 'premium membership is required to create challenges' };
    }

    const [activeCreatedChallengeCount, activeChallengeIds] = await Promise.all([
        getActiveCreatedChallengeCount(user.id),
        getActiveChallengeIdsForUser(user.id),
    ]);

    if (activeCreatedChallengeCount >= MAX_ACTIVE_CREATED_CHALLENGES) {
        return { error: 'premium users can only create one active challenge at a time' };
    }

    if (activeChallengeIds.size >= getActiveChallengeLimit(user)) {
        return { error: 'premium users can only participate in two active challenges at a time' };
    }

    return { allowed: true };
}

function getRewardCoins(challenge, participant) {
    const cappedDays = Math.min(participant.daysCompleted, challenge.durationDays);
    const progressRatio = cappedDays / challenge.durationDays;

    return Math.floor(challenge.coinReward * progressRatio);
}

function isRewardClaimable(challenge, now = new Date()) {
    return challenge.status === 'completed' || challenge.endsAt <= now;
}

function isChallengeJoinable(challenge, now = new Date()) {
    return challenge.status !== 'completed' && challenge.status !== 'failed' && challenge.endsAt > now;
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
        habit: participant.habit ? participant.habit.toString() : null,
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

function serializeInvitation(invitation) {
    if (!invitation) {
        return null;
    }

    const challenge = typeof invitation.challenge === 'object' && invitation.challenge?._id
        ? serializeChallenge(invitation.challenge)
        : invitation.challenge.toString();

    return {
        id: invitation._id.toString(),
        challenge,
        inviter: invitation.inviter.toString(),
        invitee: invitation.invitee.toString(),
        status: invitation.status,
        respondedAt: invitation.respondedAt,
        createdAt: invitation.createdAt,
        updatedAt: invitation.updatedAt,
    };
}

export async function createChallenge(input, user) {
    const createPermission = await canCreateChallenge(user);

    if (createPermission.error) {
        return { error: createPermission.error };
    }

    const habit = await getOwnedHabit(input.habitId, user.id);

    if (!habit) {
        return { error: 'habitId must belong to the current user' };
    }

    const startsAt = input.startsAt || new Date();
    const challenge = await Challenge.create({
        ...input,
        createdBy: user.id,
        habitTitle: input.habitTitle || habit.title,
        coinReward: getCoinReward(input.durationDays),
        startsAt,
        endsAt: calculateEndDate(startsAt, input.durationDays),
    });
    const participant = await ChallengeParticipant.create({
        challenge: challenge._id,
        user: user.id,
        habit: habit._id,
    });

    return {
        challenge: serializeChallenge(challenge),
        participant: serializeParticipant(participant, challenge),
    };
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
        coinReward: getCoinReward(nextDurationDays),
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
    await ChallengeInvitation.deleteMany({ challenge: challengeId });
    await Challenge.findByIdAndDelete(challengeId);

    return { challenge: serializeChallenge(challenge) };
}

export async function joinChallenge(challengeId, user, { habitId }) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    const habit = await getOwnedHabit(habitId, user.id);

    if (!habit) {
        return { error: 'habitId must belong to the current user' };
    }

    if (!await canViewChallenge(challenge, user)) {
        return { error: 'user must be friends with the challenge creator to join this challenge' };
    }

    if (!isChallengeJoinable(challenge)) {
        return { error: 'challenge is no longer joinable' };
    }

    if (!await canAddActiveChallenge(user, challenge._id)) {
        return { error: hasPremiumMembership(user)
            ? 'premium users can only participate in two active challenges at a time'
            : 'free users can only participate in one active challenge at a time' };
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
        existingParticipant.habit = habitId;
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
        habit: habitId,
    });

    return {
        challenge: serializeChallenge(challenge),
        participant: serializeParticipant(participant, challenge),
    };
}

export async function createInvitation(challengeId, inviteeId, user) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    if (!isChallengeCreator(challenge, user)) {
        return { forbidden: true };
    }

    if (!isChallengeJoinable(challenge)) {
        return { error: 'challenge is no longer joinable' };
    }

    if (sameId(inviteeId, user.id)) {
        return { error: 'cannot invite yourself to your own challenge' };
    }

    const invitee = await User.findOne({ _id: inviteeId, isDeleted: false }).lean();

    if (!invitee) {
        return { error: 'invitee not found' };
    }

    if (!await areFriends(challenge.createdBy, inviteeId)) {
        return { error: 'invitee must be friends with the challenge creator' };
    }

    const existingParticipant = await ChallengeParticipant.findOne({
        challenge: challengeId,
        user: inviteeId,
        status: { $ne: 'left' },
    }).lean();

    if (existingParticipant) {
        return { error: 'invitee already joined this challenge' };
    }

    const existingPendingInvitation = await ChallengeInvitation.findOne({
        challenge: challengeId,
        invitee: inviteeId,
        status: 'pending',
    }).lean();

    if (existingPendingInvitation) {
        return { error: 'pending challenge invitation already exists' };
    }

    const invitation = await ChallengeInvitation.create({
        challenge: challengeId,
        inviter: user.id,
        invitee: inviteeId,
    });

    await invitation.populate('challenge');

    return { invitation: serializeInvitation(invitation) };
}

export async function listInvitations(userId) {
    const [incoming, outgoing] = await Promise.all([
        ChallengeInvitation.find({ invitee: userId, status: 'pending' })
            .populate('challenge')
            .sort({ createdAt: -1 }),
        ChallengeInvitation.find({ inviter: userId, status: 'pending' })
            .populate('challenge')
            .sort({ createdAt: -1 }),
    ]);

    return {
        incoming: incoming.map(serializeInvitation),
        outgoing: outgoing.map(serializeInvitation),
    };
}

export async function acceptInvitation(invitationId, user, { habitId }) {
    const invitation = await ChallengeInvitation.findOne({
        _id: invitationId,
        invitee: user.id,
        status: 'pending',
    }).populate('challenge');

    if (!invitation) {
        return { notFound: true };
    }

    const challenge = invitation.challenge;
    const habit = await getOwnedHabit(habitId, user.id);

    if (!habit) {
        return { error: 'habitId must belong to the current user' };
    }

    if (!isChallengeJoinable(challenge)) {
        return { error: 'challenge is no longer joinable' };
    }

    if (!await canAddActiveChallenge(user, challenge._id)) {
        return { error: hasPremiumMembership(user)
            ? 'premium users can only participate in two active challenges at a time'
            : 'free users can only participate in one active challenge at a time' };
    }

    let participant = await ChallengeParticipant.findOne({
        challenge: challenge._id,
        user: user.id,
    });

    if (participant && participant.status !== 'left') {
        invitation.status = 'accepted';
        invitation.respondedAt = new Date();
        await invitation.save();

        return {
            invitation: serializeInvitation(invitation),
            participant: serializeParticipant(participant, challenge),
        };
    }

    if (participant) {
        participant.status = 'active';
        participant.joinedAt = new Date();
        participant.habit = habitId;
        participant.daysCompleted = 0;
        participant.lastCompletedAt = null;
        participant.rewardClaimed = false;
        participant.rewardClaimedAt = null;
        participant.rewardCoins = 0;
        await participant.save();
    } else {
        participant = await ChallengeParticipant.create({
            challenge: challenge._id,
            user: user.id,
            habit: habitId,
        });
    }

    invitation.status = 'accepted';
    invitation.respondedAt = new Date();
    await invitation.save();

    return {
        invitation: serializeInvitation(invitation),
        participant: serializeParticipant(participant, challenge),
    };
}

export async function rejectInvitation(invitationId, user) {
    const invitation = await ChallengeInvitation.findOne({
        _id: invitationId,
        invitee: user.id,
        status: 'pending',
    }).populate('challenge');

    if (!invitation) {
        return { notFound: true };
    }

    invitation.status = 'rejected';
    invitation.respondedAt = new Date();
    await invitation.save();

    return { invitation: serializeInvitation(invitation) };
}

export async function recordProgressForHabit({ userId, habitId, days = 1 }) {
    const participants = await ChallengeParticipant.find({
        user: userId,
        habit: habitId,
        status: 'active',
    });

    const results = [];

    for (const participant of participants) {
        const challenge = await Challenge.findById(participant.challenge);

        if (!challenge || !isChallengeJoinable(challenge)) {
            continue;
        }

        participant.daysCompleted = Math.min(participant.daysCompleted + days, challenge.durationDays);
        participant.lastCompletedAt = new Date();

        if (participant.daysCompleted >= challenge.durationDays) {
            participant.status = 'completed';
        }

        await participant.save();

        results.push({
            challenge: serializeChallenge(challenge),
            participant: serializeParticipant(participant, challenge),
        });
    }

    return results;
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
