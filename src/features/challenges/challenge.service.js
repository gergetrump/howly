import Challenge from './challenge.model.js';
import ChallengeInvitation from './challengeInvitation.model.js';
import ChallengeParticipant from './challengeParticipant.model.js';
import Habit from '../habits/habit.model.js';
import User from '../users/user.model.js';
import { Friendship } from '../social/social.model.js';
import { getPlanForUser, hasPremiumAccess } from '../../config/plans.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const COINS_PER_CHALLENGE_DAY = 5;
const START_LOCKED_UPDATE_FIELDS = [
    'title',
    'habitId',
    'habitTitle',
    'description',
    'frequency',
    'durationDays',
    'startsAt',
    'visibility',
];

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

async function getChallengeUserContext(user) {
    const currentUser = await User.findOne({ _id: user.id, isDeleted: false })
        .select('role isPremium')
        .lean();

    return {
        id: user.id,
        role: currentUser?.role ?? user.role,
        isPremium: currentUser?.isPremium === true,
    };
}

function hasPremiumMembership(user) {
    return hasPremiumAccess(user);
}

function getActiveChallengeLimit(user) {
    return getPlanForUser(user).limits.maxActiveChallenges;
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

    const joinedChallenges = participantChallengeIds.length
        ? await Challenge.find({
            _id: { $in: participantChallengeIds },
            ...activeChallengeConditions,
        }).select('_id').lean()
        : [];

    return new Set([
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
    const currentUser = await getChallengeUserContext(user);
    const activeChallengeIds = await getActiveChallengeIdsForUser(currentUser.id);
    const activeChallengeLimit = getActiveChallengeLimit(currentUser);

    if (challengeId) {
        activeChallengeIds.add(challengeId.toString());
    }

    return {
        allowed: activeChallengeIds.size <= activeChallengeLimit,
        isPremium: hasPremiumMembership(currentUser),
    };
}

async function canCreateChallenge(user) {
    const currentUser = await getChallengeUserContext(user);
    const plan = getPlanForUser(currentUser);

    if (!plan.permissions.canCreateChallenges) {
        return {
            error: 'premium membership is required to create challenges',
            code: 'PREMIUM_REQUIRED',
        };
    }

    const [activeCreatedChallengeCount, activeChallengeIds] = await Promise.all([
        getActiveCreatedChallengeCount(currentUser.id),
        getActiveChallengeIdsForUser(currentUser.id),
    ]);

    if (activeCreatedChallengeCount >= plan.limits.maxActiveCreatedChallenges) {
        return {
            error: 'you can only create one challenge at a time as premium user, finish your other challenge first',
            code: 'PREMIUM_ACTIVE_CREATED_LIMIT',
        };
    }

    if (activeChallengeIds.size >= getActiveChallengeLimit(currentUser)) {
        return {
            error: 'you can only join 5 challenges at max',
            code: 'PREMIUM_ACTIVE_CHALLENGE_LIMIT',
        };
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

function hasStarted(challenge, now = new Date()) {
    return challenge.startsAt <= now;
}

function getDisplayStatus(challenge, now = new Date()) {
    if (challenge.status === 'completed' || challenge.status === 'failed') {
        return challenge.status;
    }

    if (challenge.endsAt <= now) {
        return 'completed';
    }

    if (challenge.startsAt <= now) {
        return 'active';
    }

    return 'notStarted';
}

function hasStartLockedUpdates(updates) {
    return START_LOCKED_UPDATE_FIELDS.some((field) => updates[field] !== undefined);
}

function serializeChallenge(challenge, participantCount = 0) {
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
        status: getDisplayStatus(challenge),
        visibility: challenge.visibility,
        participantCount,
        createdAt: challenge.createdAt,
        updatedAt: challenge.updatedAt,
    };
}

async function getParticipantCounts(challengeIds) {
    if (!challengeIds.length) {
        return new Map();
    }

    const counts = await ChallengeParticipant.aggregate([
        {
            $match: {
                challenge: { $in: challengeIds },
                status: { $ne: 'left' },
            },
        },
        {
            $group: {
                _id: '$challenge',
                count: { $sum: 1 },
            },
        },
    ]);

    return new Map(counts.map((item) => [item._id.toString(), item.count]));
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

function serializeInvitation(invitation, participantCount = 0) {
    if (!invitation) {
        return null;
    }

    const challenge = typeof invitation.challenge === 'object' && invitation.challenge?._id
        ? serializeChallenge(invitation.challenge, participantCount)
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
        challenge: serializeChallenge(challenge, 1),
        participant: serializeParticipant(participant, challenge),
    };
}

export async function listChallenges(filters = {}, user) {
    const conditions = [];

    if (filters.scope === 'active') {
        const activeChallengeIds = await getActiveChallengeIdsForUser(user.id);

        if (activeChallengeIds.size === 0) {
            return [];
        }

        conditions.push({ _id: { $in: [...activeChallengeIds] } });
    }

    if (filters.scope === 'friends') {
        const friendIds = await getFriendIds(user.id);

        if (friendIds.length === 0) {
            return [];
        }

        conditions.push({
            visibility: 'friends',
            createdBy: { $in: friendIds },
        });
    }

    if (filters.scope === 'public') {
        conditions.push({ visibility: 'public' });
    }

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
    } else if (!filters.scope && user.role !== 'admin') {
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
    const participantCounts = await getParticipantCounts(challenges.map((challenge) => challenge._id));

    return challenges.map((challenge) => (
        serializeChallenge(challenge, participantCounts.get(challenge._id.toString()) ?? 0)
    ));
}

export async function getChallengeById(challengeId, user) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    if (!await canViewChallenge(challenge, user)) {
        return { forbidden: true };
    }

    const participantCount = await ChallengeParticipant.countDocuments({
        challenge: challengeId,
        status: { $ne: 'left' },
    });

    return { challenge: serializeChallenge(challenge, participantCount) };
}

export async function updateChallenge(challengeId, updates, user) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    if (!isChallengeOwner(challenge, user)) {
        return { forbidden: true };
    }

    if (hasStarted(challenge) && hasStartLockedUpdates(updates)) {
        return {
            error: 'challenge details cannot be edited after the challenge has started',
            code: 'CHALLENGE_EDIT_LOCKED',
        };
    }

    let nextHabitTitle = updates.habitTitle;

    if (updates.habitId !== undefined) {
        const habit = await getOwnedHabit(updates.habitId, user.id);

        if (!habit) {
            return { error: 'habitId must belong to the current user' };
        }

        nextHabitTitle = habit.title;
        await ChallengeParticipant.findOneAndUpdate(
            { challenge: challengeId, user: user.id },
            { habit: habit._id },
            { returnDocument: 'after' }
        );
    }

    const nextStartsAt = updates.startsAt || challenge.startsAt;
    const nextDurationDays = updates.durationDays || challenge.durationDays;
    const { habitId, ...challengeUpdates } = updates;

    Object.assign(challenge, challengeUpdates, {
        ...(nextHabitTitle ? { habitTitle: nextHabitTitle } : {}),
        coinReward: getCoinReward(nextDurationDays),
        endsAt: calculateEndDate(nextStartsAt, nextDurationDays),
    });

    await challenge.save();

    const participantCount = await ChallengeParticipant.countDocuments({
        challenge: challengeId,
        status: { $ne: 'left' },
    });

    return { challenge: serializeChallenge(challenge, participantCount) };
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

    const joinPermission = await canAddActiveChallenge(user, challenge._id);

    if (!joinPermission.allowed) {
        return {
            error: joinPermission.isPremium
                ? 'you can only join 5 challenges at max'
                : 'you can only join 2 challenges with the free version, buy premium to join more challenges',
            code: joinPermission.isPremium
                ? 'PREMIUM_ACTIVE_CHALLENGE_LIMIT'
                : 'FREE_ACTIVE_CHALLENGE_LIMIT',
        };
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
        const participantCount = await ChallengeParticipant.countDocuments({
            challenge: challengeId,
            status: { $ne: 'left' },
        });

        return {
            challenge: serializeChallenge(challenge, participantCount),
            participant: serializeParticipant(existingParticipant, challenge),
        };
    }

    const participant = await ChallengeParticipant.create({
        challenge: challengeId,
        user: user.id,
        habit: habitId,
    });
    const participantCount = await ChallengeParticipant.countDocuments({
        challenge: challengeId,
        status: { $ne: 'left' },
    });

    return {
        challenge: serializeChallenge(challenge, participantCount),
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

    const participantCount = await ChallengeParticipant.countDocuments({
        challenge: challengeId,
        status: { $ne: 'left' },
    });

    return { invitation: serializeInvitation(invitation, participantCount) };
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
    const challengeIds = [...incoming, ...outgoing]
        .map((invitation) => invitation.challenge?._id)
        .filter(Boolean);
    const participantCounts = await getParticipantCounts(challengeIds);

    return {
        incoming: incoming.map((invitation) => (
            serializeInvitation(invitation, participantCounts.get(invitation.challenge._id.toString()) ?? 0)
        )),
        outgoing: outgoing.map((invitation) => (
            serializeInvitation(invitation, participantCounts.get(invitation.challenge._id.toString()) ?? 0)
        )),
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

    const joinPermission = await canAddActiveChallenge(user, challenge._id);

    if (!joinPermission.allowed) {
        return {
            error: joinPermission.isPremium
                ? 'you can only join 5 challenges at max'
                : 'you can only join 2 challenges with the free version, buy premium to join more challenges',
            code: joinPermission.isPremium
                ? 'PREMIUM_ACTIVE_CHALLENGE_LIMIT'
                : 'FREE_ACTIVE_CHALLENGE_LIMIT',
        };
    }

    let participant = await ChallengeParticipant.findOne({
        challenge: challenge._id,
        user: user.id,
    });

    if (participant && participant.status !== 'left') {
        invitation.status = 'accepted';
        invitation.respondedAt = new Date();
        await invitation.save();
        const participantCount = await ChallengeParticipant.countDocuments({
            challenge: challenge._id,
            status: { $ne: 'left' },
        });

        return {
            invitation: serializeInvitation(invitation, participantCount),
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
    const participantCount = await ChallengeParticipant.countDocuments({
        challenge: challenge._id,
        status: { $ne: 'left' },
    });

    return {
        invitation: serializeInvitation(invitation, participantCount),
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
