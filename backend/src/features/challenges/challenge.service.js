import Challenge from './challenge.model.js';
import { moderateText } from '../../moderation/moderation.service.js';
import ChallengeInvitation from './challengeInvitation.model.js';
import ChallengeParticipant from './challengeParticipant.model.js';
import Habit from '../habits/habit.model.js';
import User from '../users/user.model.js';
import { Friendship } from '../social/social.model.js';
import { sendChallengeInvitationEmail } from '../mail/mail.service.js';
import config from '../../../config.js';
import { getPlanForUser, hasPremiumAccess } from '../../config/plans.js';
import { toOffsetPage } from '../../utils/pagination.js';
import { toTaxonomyDto } from '../taxonomy/taxonomy.schema.js';
import {
    clearTaxonomyFields,
    copyTaxonomyToHabit,
    scheduleTaxonomyForChallenge,
    scheduleTaxonomyForHabit,
} from '../taxonomy/taxonomy.service.js';
import { createNotification } from '../notifications/notification.service.js';
import {
    buildRecommendationReason,
    buildUserHabitProfile,
    loadRecommendationLabels,
    resolveDefaultChallengeSort,
    sortChallengesByRecommendation,
} from './challengeRecommendation.service.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const COINS_PER_CHALLENGE_DAY = 5;
const CHALLENGE_INVITATIONS_PATH = '/challenges';
const PAST_CHALLENGE_STATUSES = ['completed', 'failed'];

/* Checks whether a user wants a challenge email type. */
function canSendNotificationEmail(user, preferenceKey) {
    const preferences = user?.notificationPreferences ?? {};

    return preferences.emailEnabled === true && preferences[preferenceKey] === true;
}

/* Builds a readable display name for a user. */
function getUserDisplayName(user) {
    return [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.username || 'A friend';
}
const START_LOCKED_UPDATE_FIELDS = [
    'title',
    'habitTitle',
    'habitTemplate',
    'description',
    'frequency',
    'durationDays',
    'startsAt',
    'visibility',
];

/* Calculates a challenge end date from start and duration. */
function calculateEndDate(startsAt, durationDays) {
    return new Date(startsAt.getTime() + durationDays * DAY_IN_MS);
}

/* Calculates the coin reward for a challenge duration. */
function getCoinReward(durationDays) {
    return durationDays * COINS_PER_CHALLENGE_DAY;
}

/* Checks whether the user owns a challenge. */
function isChallengeOwner(challenge, user) {
    return challenge.createdBy.toString() === user.id || user.role === 'admin';
}

/* Checks whether the user created a challenge. */
function isChallengeCreator(challenge, user) {
    return challenge.createdBy.toString() === user.id;
}

/* Compares two Mongo ids as strings. */
function sameId(firstId, secondId) {
    return firstId?.toString() === secondId?.toString();
}

/* Builds the canonical friendship pair key. */
function buildFriendshipPair(firstUserId, secondUserId) {
    const [userA, userB] = [firstUserId.toString(), secondUserId.toString()].sort();
    return { userA, userB };
}

/* Checks whether two users are friends. */
async function areFriends(firstUserId, secondUserId) {
    const friendship = await Friendship.findOne(buildFriendshipPair(firstUserId, secondUserId)).lean();

    return Boolean(friendship);
}

/* Loads ids for all friends of a user. */
async function getFriendIds(userId) {
    const friendships = await Friendship.find({
        $or: [{ userA: userId }, { userB: userId }],
    }).lean();

    return friendships.map((friendship) => (
        sameId(friendship.userA, userId) ? friendship.userB : friendship.userA
    ));
}

/* Loads users blocked by or blocking this user. */
async function getBlockedRelationshipUserIds(userId) {
    const [user, blockedMe] = await Promise.all([
        User.findById(userId).select('blockedUsers').lean(),
        User.find({ blockedUsers: userId }, '_id').lean(),
    ]);

    return new Set([
        ...(user?.blockedUsers ?? []).map((id) => id.toString()),
        ...blockedMe.map((blockedUser) => blockedUser._id.toString()),
    ]);
}

/* Checks whether either user blocks the other. */
async function hasBlockRelationship(firstUserId, secondUserId) {
    if (sameId(firstUserId, secondUserId)) {
        return false;
    }

    const secondUserIdString = secondUserId.toString();
    const blockedRelationshipIds = await getBlockedRelationshipUserIds(firstUserId);

    return blockedRelationshipIds.has(secondUserIdString);
}

/* Checks challenge visibility with preloaded relationship context. */
function canViewChallengeFromContext(challenge, user, { friendIds = new Set(), blockedRelationshipIds = new Set(), viewerParticipant = null } = {}) {
    if (isChallengeOwner(challenge, user)) {
        return true;
    }

    if (viewerParticipant && viewerParticipant.status !== 'left') {
        return true;
    }

    const creatorId = challenge.createdBy.toString();

    if (blockedRelationshipIds.has(creatorId)) {
        return false;
    }

    if (challenge.visibility === 'public') {
        return true;
    }

    return friendIds.has(creatorId);
}

/* Checks whether a user can view a challenge. */
async function canViewChallenge(challenge, user) {
    if (isChallengeOwner(challenge, user)) {
        return true;
    }

    const viewerParticipant = await ChallengeParticipant.findOne({
        challenge: challenge._id,
        user: user.id,
        status: { $ne: 'left' },
    }).lean();

    if (viewerParticipant) {
        return true;
    }

    if (await hasBlockRelationship(user.id, challenge.createdBy)) {
        return false;
    }

    if (challenge.visibility === 'public') {
        return true;
    }

    return areFriends(user.id, challenge.createdBy);
}

/* Converts habit frequency labels to challenge frequency values. */
function habitFrequencyToChallengeFrequency(frequency) {
    return String(frequency || '').toLowerCase();
}

/* Normalizes challenge habit template input. */
function toHabitTemplate(input = {}) {
    return {
        title: input.title,
        description: input.description ?? '',
        icon: input.icon ?? 'C',
        type: input.type ?? 'boolean',
        target: input.target ?? null,
        unit: input.unit ?? '',
        frequency: input.frequency,
        customDays: input.customDays ?? [],
        category: input.category ?? null,
    };
}

/* Builds habit creation fields from a challenge template. */
function getHabitFieldsFromTemplate(template) {
    const habitTemplate = toHabitTemplate(template);

    return {
        title: habitTemplate.title,
        description: habitTemplate.description,
        icon: habitTemplate.icon,
        type: habitTemplate.type,
        target: habitTemplate.target,
        unit: habitTemplate.unit,
        frequency: habitTemplate.frequency,
        customDays: habitTemplate.customDays,
        category: habitTemplate.category,
    };
}

const EMPTY_TAXONOMY_FIELDS = {
    categoryKey: null,
    subcategoryKey: null,
    canonicalHabitKey: null,
    score: null,
    assignedAt: null,
};

/* Builds habit update fields for synced participant habits. */
function getHabitFieldsFromTemplateForParticipantSync(template) {
    const fields = getHabitFieldsFromTemplate(template);
    delete fields.category;
    return fields;
}

/* Decides whether challenge taxonomy must be recalculated. */
function shouldReassignChallengeTaxonomy(challenge, updates, nextHabitTemplate) {
    if (updates.title !== undefined && updates.title !== challenge.title) {
        return true;
    }

    if (updates.description !== undefined && updates.description !== challenge.description) {
        return true;
    }

    if (updates.habitTemplate) {
        const currentTemplate = challenge.habitTemplate;

        if (nextHabitTemplate.title !== currentTemplate?.title) {
            return true;
        }

        if ((nextHabitTemplate.description ?? '') !== (currentTemplate?.description ?? '')) {
            return true;
        }
    }

    return false;
}

/* Decides whether participant habit taxonomy must be recalculated. */
function shouldReassignParticipantHabitTaxonomy(challenge, updates, nextHabitTemplate) {
    if (!updates.habitTemplate) {
        return false;
    }

    const currentTemplate = challenge.habitTemplate;

    return nextHabitTemplate.title !== currentTemplate?.title
        || (nextHabitTemplate.description ?? '') !== (currentTemplate?.description ?? '');
}

/* Clears taxonomy fields before background reassignment. */
function clearChallengeTaxonomyFields(challenge) {
    clearTaxonomyFields(challenge);

    if (challenge.habitTemplate) {
        challenge.habitTemplate.category = null;
    }
}

/* Creates the linked habit for one challenge participant. */
async function createChallengeHabitForUser({ challenge, userId }) {
    const habit = await Habit.create({
        ...getHabitFieldsFromTemplate(challenge.habitTemplate),
        ownerId: userId,
        source: 'challenge',
        challengeId: challenge._id,
    });
    copyTaxonomyToHabit(habit, challenge);
    await habit.save();
    if (!habit.taxonomy?.canonicalHabitKey) {
        scheduleTaxonomyForHabit(habit._id);
    }
    return habit;
}

/* Loads reusable user relationship context for challenge checks. */
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

/* Checks whether a user has premium challenge privileges. */
function hasPremiumMembership(user) {
    return hasPremiumAccess(user);
}

/* Reads the user's active challenge limit. */
function getActiveChallengeLimit(user) {
    return getPlanForUser(user).limits.maxActiveChallenges;
}

/* Builds query conditions for active challenges. */
function getActiveChallengeConditions(now = new Date()) {
    return {
        status: { $nin: ['completed', 'failed'] },
        endsAt: { $gt: now },
    };
}

/* Builds query conditions for recent past challenges. */
function getPastChallengeConditions(now = new Date()) {
    const pastWindowStart = new Date(now.getTime() - 30 * DAY_IN_MS);

    return {
        endsAt: { $gte: pastWindowStart },
        $or: [
            { status: { $in: PAST_CHALLENGE_STATUSES } },
            { endsAt: { $lte: now } },
        ],
    };
}

/* Loads active challenge ids for a participant. */
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

/* Counts active challenges created by a user. */
async function getActiveCreatedChallengeCount(userId, now = new Date()) {
    return Challenge.countDocuments({
        createdBy: userId,
        ...getActiveChallengeConditions(now),
    });
}

/* Checks whether a user can join another active challenge. */
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

/* Checks whether a user can create another active challenge. */
async function canCreateChallenge(user) {
    const currentUser = await getChallengeUserContext(user);
    const plan = getPlanForUser(currentUser);

    if (!plan.permissions.canCreateChallenges) {
        return {
            error: 'Creating your own challenges is a Premium feature.',
            code: 'PREMIUM_REQUIRED',
        };
    }

    const [activeCreatedChallengeCount, activeChallengeIds] = await Promise.all([
        getActiveCreatedChallengeCount(currentUser.id),
        getActiveChallengeIdsForUser(currentUser.id),
    ]);

    if (activeCreatedChallengeCount >= plan.limits.maxActiveCreatedChallenges) {
        return {
            error: 'You can only create one active challenge at a time. Finish your current challenge before creating another one.',
            code: 'PREMIUM_ACTIVE_CREATED_LIMIT',
        };
    }

    if (activeChallengeIds.size >= getActiveChallengeLimit(currentUser)) {
        return {
            error: 'You reached the maximum number of active challenges for your plan.',
            code: 'PREMIUM_ACTIVE_CHALLENGE_LIMIT',
        };
    }

    return { allowed: true };
}

/* Calculates reward coins based on completed days. */
function getRewardCoins(challenge, participant) {
    const cappedDays = Math.min(participant.daysCompleted, challenge.durationDays);
    const progressRatio = cappedDays / challenge.durationDays;

    return Math.floor(challenge.coinReward * progressRatio);
}

/* Checks whether a challenge reward can be claimed. */
function isRewardClaimable(challenge, now = new Date()) {
    return challenge.status === 'completed' || challenge.endsAt <= now;
}

/* Checks whether a challenge can still be joined. */
function isChallengeJoinable(challenge, now = new Date()) {
    return challenge.status !== 'completed' && challenge.status !== 'failed' && challenge.endsAt > now;
}

/* Checks whether a challenge has started. */
function hasStarted(challenge, now = new Date()) {
    return challenge.startsAt <= now;
}

/* Computes the status shown to clients. */
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

/* Checks whether updates touch fields locked after start. */
function hasStartLockedUpdates(updates) {
    return START_LOCKED_UPDATE_FIELDS.some((field) => updates[field] !== undefined);
}

/* Serializes a challenge for API responses. */
function serializeChallenge(challenge, participantCount = 0, viewerParticipant = null, extras = {}) {
    if (!challenge) {
        return null;
    }

    return {
        id: challenge._id.toString(),
        createdBy: challenge.createdBy.toString(),
        title: challenge.title,
        habitTitle: challenge.habitTitle,
        habitTemplate: challenge.habitTemplate,
        description: challenge.description,
        taxonomy: toTaxonomyDto(challenge.taxonomy),
        coinReward: challenge.coinReward,
        frequency: challenge.frequency,
        durationDays: challenge.durationDays,
        startsAt: challenge.startsAt,
        endsAt: challenge.endsAt,
        status: getDisplayStatus(challenge),
        visibility: challenge.visibility,
        participantCount,
        viewerParticipantStatus: viewerParticipant?.status,
        viewerParticipantId: viewerParticipant?._id?.toString(),
        viewerParticipantDaysCompleted: viewerParticipant?.daysCompleted ?? 0,
        viewerParticipantRewardClaimed: viewerParticipant?.rewardClaimed ?? false,
        viewerParticipantRewardCoins: viewerParticipant?.rewardCoins ?? 0,
        viewerParticipantPendingRewardCoins: viewerParticipant
            ? getRewardCoins(challenge, viewerParticipant)
            : 0,
        ...(extras.recommendationReason
            ? { recommendationReason: extras.recommendationReason }
            : {}),
        createdAt: challenge.createdAt,
        updatedAt: challenge.updatedAt,
    };
}

/* Checks whether a habit is completed in its current period. */
function isCompletedForPeriod(habit) {
    if (!habit?.lastCompletedAt) {
        return false;
    }

    const now = new Date();
    const completedAt = new Date(habit.lastCompletedAt);

    if (habit.frequency === 'Weekly') {
        const day = now.getDay() || 7;
        const monday = new Date(now);
        monday.setHours(0, 0, 0, 0);
        monday.setDate(monday.getDate() - day + 1);
        return completedAt >= monday;
    }

    if (habit.frequency === 'Monthly') {
        return completedAt.getFullYear() === now.getFullYear()
            && completedAt.getMonth() === now.getMonth();
    }

    return completedAt.getFullYear() === now.getFullYear()
        && completedAt.getMonth() === now.getMonth()
        && completedAt.getDate() === now.getDate();
}

/* Serializes a challenge-linked habit for the dashboard. */
function serializeChallengeHabit(habit) {
    if (!habit) {
        return null;
    }

    return {
        id: habit._id.toString(),
        title: habit.title,
        description: habit.description,
        icon: habit.icon,
        type: habit.type,
        target: habit.target ?? null,
        unit: habit.unit ?? null,
        frequency: habit.frequency,
        customDays: habit.customDays || [],
        category: habit.category ?? null,
        taxonomy: toTaxonomyDto(habit.taxonomy),
        source: habit.source ?? 'challenge',
        challengeId: habit.challengeId ? habit.challengeId.toString() : null,
        isCompletedToday: isCompletedForPeriod(habit),
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
    };
}

/* Counts non-left participants for challenge ids. */
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

/* Loads the viewer's participant records for challenge ids. */
async function getViewerParticipations(challengeIds, userId) {
    if (!challengeIds.length || !userId) {
        return new Map();
    }

    const participations = await ChallengeParticipant.find({
        challenge: { $in: challengeIds },
        user: userId,
        status: { $ne: 'left' },
    }).lean();

    return new Map(
        participations.map((participant) => [participant.challenge.toString(), participant])
    );
}

/* Serializes one challenge participant. */
function serializeParticipant(participant, challenge) {
    if (!participant) {
        return null;
    }

    const user = isPopulatedParticipantUser(participant.user)
        ? serializeParticipantUser(participant.user)
        : participant.user.toString();

    return {
        id: participant._id.toString(),
        challenge: participant.challenge.toString(),
        user,
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

/* Checks whether a participant user was populated. */
function isPopulatedParticipantUser(user) {
    return Boolean(
        user
        && typeof user === 'object'
        && typeof user.toHexString !== 'function'
        && (
            user.constructor?.modelName === 'User'
            || user.username !== undefined
            || user.firstName !== undefined
            || user.lastName !== undefined
            || user.profilePictureUrl !== undefined
        )
    );
}

/* Serializes a user inside participant lists. */
function serializeParticipantUser(user) {
    return {
        id: user._id.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePictureUrl: user.profilePictureUrl ?? null,
        streak: user.streak ?? 0,
        streakCount: user.streakCount ?? user.streak ?? 0,
        isPremium: user.isPremium ?? false,
        role: user.role,
        ghostMode: user.ghostMode ?? false,
    };
}

/* Serializes a challenge invitation. */
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

/* Creates a new challenge and owner participation. */
export async function createChallenge(input, user) {
    const createPermission = await canCreateChallenge(user);

    if (createPermission.error) {
        return { error: createPermission.error, code: createPermission.code };
    }

    const moderation = await moderateText(
        [input.title, input.description, input.habitTemplate?.title].filter(Boolean).join(' '),
    );
    if (moderation.flagged) {
        return {
            error: 'Please choose a challenge title and description without harmful or inappropriate content.',
            code: 'CHALLENGE_MODERATION_BLOCKED',
        };
    }

    const startsAt = input.startsAt || new Date();
    const habitTemplate = toHabitTemplate(input.habitTemplate);
    const challenge = await Challenge.create({
        ...input,
        createdBy: user.id,
        habitTemplate,
        habitTitle: habitTemplate.title,
        frequency: input.frequency || habitFrequencyToChallengeFrequency(habitTemplate.frequency),
        coinReward: getCoinReward(input.durationDays),
        startsAt,
        endsAt: calculateEndDate(startsAt, input.durationDays),
    });

    scheduleTaxonomyForChallenge(challenge._id);

    const habit = await createChallengeHabitForUser({ challenge, userId: user.id });
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

/* Lists challenges visible to a user. */
export async function listChallenges(filters = {}, user) {
    const conditions = [];
    const now = new Date();

    if (filters.scope === 'active') {
        const activeChallengeIds = await getActiveChallengeIdsForUser(user.id, now);

        if (activeChallengeIds.size === 0) {
            return [];
        }

        conditions.push({ _id: { $in: [...activeChallengeIds] } });
    }

    if (filters.scope === 'past') {
        const pastParticipations = await ChallengeParticipant.find({
            user: user.id,
            status: { $ne: 'left' },
        }).select('challenge').lean();
        const pastChallengeIds = pastParticipations.map((participant) => participant.challenge);

        if (pastChallengeIds.length === 0) {
            return [];
        }

        conditions.push({
            _id: { $in: pastChallengeIds },
            ...getPastChallengeConditions(now),
        });
    }

    if (filters.scope === 'friends') {
        const friendIds = await getFriendIds(user.id);

        if (friendIds.length === 0) {
            return [];
        }

        conditions.push({
            visibility: 'friends',
            createdBy: { $in: friendIds },
            ...getActiveChallengeConditions(now),
        });
    }

    if (filters.scope === 'public') {
        conditions.push({
            visibility: 'public',
            ...getActiveChallengeConditions(now),
        });
    }

    if (filters.categoryKey) {
        conditions.push({ 'taxonomy.categoryKey': filters.categoryKey });
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
    const sortMode = resolveDefaultChallengeSort(filters);
    const challengeSort = sortMode === 'endsAt' || filters.scope === 'past'
        ? { endsAt: -1, createdAt: -1 }
        : { createdAt: -1 };
    const challenges = await Challenge.find(query).sort(challengeSort);
    const challengeIds = challenges.map((challenge) => challenge._id);
    const [participantCounts, viewerParticipations, visibilityFriendIds, blockedRelationshipIds] = await Promise.all([
        getParticipantCounts(challengeIds),
        getViewerParticipations(challengeIds, user.id),
        getFriendIds(user.id),
        getBlockedRelationshipUserIds(user.id),
    ]);
    const visibilityFriendIdSet = new Set(visibilityFriendIds.map((id) => id.toString()));
    const visibleChallenges = challenges.filter((challenge) => (
        canViewChallengeFromContext(challenge, user, {
            friendIds: visibilityFriendIdSet,
            blockedRelationshipIds,
            viewerParticipant: viewerParticipations.get(challenge._id.toString()),
        })
    ));

    if (sortMode === 'recommended') {
        const profile = await buildUserHabitProfile(user.id);
        const sortedChallenges = sortChallengesByRecommendation(
            visibleChallenges,
            profile,
            participantCounts,
            viewerParticipations,
        );
        const page = filters.pagination
            ? toOffsetPage(sortedChallenges, filters.pagination)
            : { items: sortedChallenges };
        const labelKeys = page.items.flatMap((challenge) => [
            challenge.taxonomy?.canonicalHabitKey,
            challenge.taxonomy?.categoryKey,
            challenge.taxonomy?.subcategoryKey,
        ]);
        const labels = await loadRecommendationLabels(labelKeys);

        const items = page.items.map((challenge) => (
            serializeChallenge(
                challenge,
                participantCounts.get(challenge._id.toString()) ?? 0,
                viewerParticipations.get(challenge._id.toString()),
                {
                    recommendationReason: buildRecommendationReason(challenge, profile, labels),
                },
            )
        ));

        return filters.pagination ? { ...page, items } : items;
    }

    const page = filters.pagination
        ? toOffsetPage(visibleChallenges, filters.pagination)
        : { items: visibleChallenges };
    const items = page.items.map((challenge) => (
        serializeChallenge(
            challenge,
            participantCounts.get(challenge._id.toString()) ?? 0,
            viewerParticipations.get(challenge._id.toString())
        )
    ));

    return filters.pagination ? { ...page, items } : items;
}

/* Loads one visible challenge by id. */
export async function getChallengeById(challengeId, user) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    if (!await canViewChallenge(challenge, user)) {
        return { forbidden: true };
    }

    const [participantCount, viewerParticipant] = await Promise.all([
        ChallengeParticipant.countDocuments({
            challenge: challengeId,
            status: { $ne: 'left' },
        }),
        ChallengeParticipant.findOne({
            challenge: challengeId,
            user: user.id,
            status: { $ne: 'left' },
        }).lean(),
    ]);

    return { challenge: serializeChallenge(challenge, participantCount, viewerParticipant) };
}

/* Updates a future owned challenge. */
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

    const nextHabitTemplate = updates.habitTemplate
        ? toHabitTemplate(updates.habitTemplate)
        : challenge.habitTemplate;
    const shouldReassignTaxonomy = shouldReassignChallengeTaxonomy(
        challenge,
        updates,
        nextHabitTemplate,
    );
    const resolvedHabitTemplate = updates.habitTemplate && !shouldReassignTaxonomy
        && updates.habitTemplate.category === undefined
        ? {
            ...nextHabitTemplate,
            category: challenge.habitTemplate?.category ?? null,
        }
        : nextHabitTemplate;
    const nextHabitTitle = updates.habitTemplate
        ? resolvedHabitTemplate.title
        : updates.habitTitle;

    const nextStartsAt = updates.startsAt || challenge.startsAt;
    const nextDurationDays = updates.durationDays || challenge.durationDays;
    const { habitTemplate, ...challengeUpdates } = updates;
    const shouldReassignParticipantHabits = shouldReassignParticipantHabitTaxonomy(
        challenge,
        updates,
        resolvedHabitTemplate,
    );

    Object.assign(challenge, challengeUpdates, {
        ...(habitTemplate ? { habitTemplate: resolvedHabitTemplate } : {}),
        ...(nextHabitTitle ? { habitTitle: nextHabitTitle } : {}),
        frequency: updates.frequency || habitFrequencyToChallengeFrequency(resolvedHabitTemplate.frequency),
        coinReward: getCoinReward(nextDurationDays),
        endsAt: calculateEndDate(nextStartsAt, nextDurationDays),
    });

    if (shouldReassignTaxonomy) {
        clearChallengeTaxonomyFields(challenge);
    }

    await challenge.save();

    let participantHabitIds = [];

    if (habitTemplate) {
        const participants = await ChallengeParticipant.find({
            challenge: challengeId,
            status: 'active',
            habit: { $ne: null },
        }).select('habit').lean();

        participantHabitIds = participants
            .map((participant) => participant.habit)
            .filter(Boolean);

        const habitUpdates = getHabitFieldsFromTemplateForParticipantSync(resolvedHabitTemplate);

        if (shouldReassignParticipantHabits) {
            await Habit.updateMany(
                {
                    _id: { $in: participantHabitIds },
                    source: 'challenge',
                },
                {
                    $set: {
                        ...habitUpdates,
                        category: null,
                        taxonomy: EMPTY_TAXONOMY_FIELDS,
                    },
                },
            );
        } else {
            await Habit.updateMany(
                {
                    _id: { $in: participantHabitIds },
                    source: 'challenge',
                },
                { $set: habitUpdates },
            );
        }
    }

    if (shouldReassignTaxonomy) {
        scheduleTaxonomyForChallenge(challenge._id);
    }

    if (shouldReassignParticipantHabits) {
        for (const habitId of participantHabitIds) {
            scheduleTaxonomyForHabit(habitId);
        }
    }

    const participantCount = await ChallengeParticipant.countDocuments({
        challenge: challengeId,
        status: { $ne: 'left' },
    });

    return { challenge: serializeChallenge(challenge, participantCount) };
}

/* Permanently deletes a future owned challenge. */
export async function deleteChallenge(challengeId, user) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    if (!isChallengeOwner(challenge, user)) {
        return { forbidden: true };
    }

    if (hasStarted(challenge)) {
        return {
            error: 'challenge cannot be deleted after it has started',
            code: 'CHALLENGE_DELETE_LOCKED',
        };
    }

    await Habit.deleteMany({ challengeId, source: 'challenge' });
    await ChallengeParticipant.deleteMany({ challenge: challengeId });
    await ChallengeInvitation.deleteMany({ challenge: challengeId });
    await Challenge.findByIdAndDelete(challengeId);

    return { challenge: serializeChallenge(challenge) };
}

/* Joins a user to a challenge and creates their habit. */
export async function joinChallenge(challengeId, user) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    if (!await canViewChallenge(challenge, user)) {
        return { error: 'You need to be friends with the creator to join this challenge.' };
    }

    if (!isChallengeJoinable(challenge)) {
        return { error: 'This challenge can no longer be joined.' };
    }

    const joinPermission = await canAddActiveChallenge(user, challenge._id);

    if (!joinPermission.allowed) {
        return {
            error: joinPermission.isPremium
                ? 'You reached the maximum number of active challenges for your plan.'
                : 'Free users can join up to 2 active challenges. Upgrade to Premium to join more.',
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
        return {
            error: 'You are already participating in this challenge.',
            code: 'CHALLENGE_ALREADY_JOINED',
        };
    }

    if (existingParticipant) {
        const habit = await createChallengeHabitForUser({ challenge, userId: user.id });
        existingParticipant.status = 'active';
        existingParticipant.joinedAt = new Date();
        existingParticipant.daysCompleted = 0;
        existingParticipant.habit = habit._id;
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

    const habit = await createChallengeHabitForUser({ challenge, userId: user.id });
    const participant = await ChallengeParticipant.create({
        challenge: challengeId,
        user: user.id,
        habit: habit._id,
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

/* Creates a pending challenge invitation. */
export async function createInvitation(challengeId, inviteeId, user) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    if (!isChallengeCreator(challenge, user)) {
        return { forbidden: true };
    }

    if (!isChallengeJoinable(challenge)) {
        return { error: 'This challenge can no longer be joined.' };
    }

    if (sameId(inviteeId, user.id)) {
        return { error: 'You cannot invite yourself to your own challenge.' };
    }

    const invitee = await User.findOne({ _id: inviteeId, isDeleted: false }).lean();

    if (!invitee) {
        return { error: 'We could not find that user.' };
    }

    if (!await areFriends(challenge.createdBy, inviteeId)) {
        return { error: 'You can only invite friends to this challenge.' };
    }

    const existingParticipant = await ChallengeParticipant.findOne({
        challenge: challengeId,
        user: inviteeId,
        status: { $ne: 'left' },
    }).lean();

    if (existingParticipant) {
        return { error: 'This friend is already participating in the challenge.' };
    }

    const existingPendingInvitation = await ChallengeInvitation.findOne({
        challenge: challengeId,
        invitee: inviteeId,
        status: 'pending',
    }).lean();

    if (existingPendingInvitation) {
        return { error: 'This friend already has a pending invitation for this challenge.' };
    }

    const invitation = await ChallengeInvitation.create({
        challenge: challengeId,
        inviter: user.id,
        invitee: inviteeId,
    });

    await invitation.populate('challenge');

    if (canSendNotificationEmail(invitee, 'challengeInvitations')) {
        const inviter = await User.findById(user.id).select('firstName lastName username').lean();

        sendChallengeInvitationEmail(invitee.email, {
            inviterName: getUserDisplayName(inviter),
            challengeTitle: challenge.title,
            challengeUrl: `${config.frontendBaseUrl}${CHALLENGE_INVITATIONS_PATH}`,
        }).catch((error) => {
            console.error('Failed to send challenge invitation email:', error);
        });
    }

    await createNotification({
        recipientId: inviteeId,
        actorId: user.id,
        type: 'challenge_invitation_received',
        entityType: 'challengeInvitation',
        entityId: invitation._id,
        metadata: {
            challengeId: challenge._id.toString(),
            challengeTitle: challenge.title,
        },
    });

    const participantCount = await ChallengeParticipant.countDocuments({
        challenge: challengeId,
        status: { $ne: 'left' },
    });

    return { invitation: serializeInvitation(invitation, participantCount) };
}

/* Lists pending incoming and outgoing invitations. */
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

/* Accepts an invitation and joins the challenge. */
export async function acceptInvitation(invitationId, user) {
    const invitation = await ChallengeInvitation.findOne({
        _id: invitationId,
        invitee: user.id,
        status: 'pending',
    }).populate('challenge');

    if (!invitation) {
        return { notFound: true };
    }

    const challenge = invitation.challenge;

    if (!isChallengeJoinable(challenge)) {
        return { error: 'This challenge can no longer be joined.' };
    }

    const joinPermission = await canAddActiveChallenge(user, challenge._id);

    if (!joinPermission.allowed) {
        return {
            error: joinPermission.isPremium
                ? 'You reached the maximum number of active challenges for your plan.'
                : 'Free users can join up to 2 active challenges. Upgrade to Premium to join more.',
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
        const habit = await createChallengeHabitForUser({ challenge, userId: user.id });
        participant.status = 'active';
        participant.joinedAt = new Date();
        participant.habit = habit._id;
        participant.daysCompleted = 0;
        participant.lastCompletedAt = null;
        participant.rewardClaimed = false;
        participant.rewardClaimedAt = null;
        participant.rewardCoins = 0;
        await participant.save();
    } else {
        const habit = await createChallengeHabitForUser({ challenge, userId: user.id });
        participant = await ChallengeParticipant.create({
            challenge: challenge._id,
            user: user.id,
            habit: habit._id,
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

/* Rejects a pending invitation. */
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

/* Lists active challenge habits for a user. */
export async function listMyChallengeHabits(user) {
    const participants = await ChallengeParticipant.find({
        user: user.id,
        status: 'active',
        habit: { $ne: null },
    })
        .populate('challenge')
        .populate('habit')
        .sort({ joinedAt: -1 });

    const activeItems = participants.filter((participant) => (
        participant.challenge
            && participant.habit
            && participant.habit.source === 'challenge'
            && isChallengeJoinable(participant.challenge)
    ));

    const participantCounts = await getParticipantCounts(
        activeItems.map((participant) => participant.challenge._id)
    );

    return activeItems.map((participant) => ({
        challenge: serializeChallenge(
            participant.challenge,
            participantCounts.get(participant.challenge._id.toString()) ?? 0
        ),
        participant: serializeParticipant(participant, participant.challenge),
        habit: serializeChallengeHabit(participant.habit),
    }));
}

/* Records challenge progress from habit check-ins. */
export async function recordProgressForHabit({ userId, habitId, days = 1 }) {
    const participants = await ChallengeParticipant.find({
        user: userId,
        habit: habitId,
        status: { $in: ['active', 'completed'] },
    });

    const results = [];

    for (const participant of participants) {
        const challenge = await Challenge.findById(participant.challenge);

        if (!challenge || !isChallengeJoinable(challenge)) {
            continue;
        }

        if (participant.status === 'completed' && days > 0) {
            continue;
        }

        participant.daysCompleted = Math.min(
            Math.max(participant.daysCompleted + days, 0),
            challenge.durationDays
        );
        participant.lastCompletedAt = days > 0 ? new Date() : null;

        if (participant.daysCompleted >= challenge.durationDays) {
            participant.status = 'completed';
        } else if (participant.status === 'completed') {
            participant.status = 'active';
        }

        await participant.save();

        results.push({
            challenge: serializeChallenge(challenge),
            participant: serializeParticipant(participant, challenge),
        });
    }

    return results;
}

/* Marks a participant as having left a challenge. */
export async function leaveChallenge(challengeId, userId) {
    const participant = await ChallengeParticipant.findOne({
        challenge: challengeId,
        user: userId,
        status: { $in: ['active', 'completed'] },
    });

    if (!participant) {
        return { notFound: true };
    }

    const challenge = await Challenge.findById(challengeId);
    const habitId = participant.habit;

    participant.status = 'left';
    participant.habit = null;
    participant.rewardClaimed = false;
    participant.rewardClaimedAt = null;
    participant.rewardCoins = 0;

    await participant.save();

    if (habitId) {
        await Habit.deleteOne({
            _id: habitId,
            ownerId: userId,
            source: 'challenge',
            challengeId,
        });
    }

    return {
        challenge: serializeChallenge(
            challenge,
            await ChallengeParticipant.countDocuments({
                challenge: challengeId,
                status: { $ne: 'left' },
            })
        ),
        participant: serializeParticipant(participant, challenge),
    };
}

/* Lists participants for a visible challenge. */
export async function listParticipants(challengeId, user) {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        return { notFound: true };
    }

    if (!await canViewChallenge(challenge, user)) {
        return { forbidden: true };
    }

    const participants = await ChallengeParticipant.find({
        challenge: challengeId,
        status: { $ne: 'left' },
    })
        .populate('user', 'username firstName lastName profilePictureUrl streak streakCount isPremium role ghostMode')
        .sort({ joinedAt: 1 });

    return {
        challenge: serializeChallenge(challenge),
        participants: participants.map((participant) => serializeParticipant(participant, challenge)),
    };
}

/* Records manual participant progress. */
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

/* Claims a user's challenge reward. */
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

    if (participant.status === 'left') {
        return { error: 'reward cannot be claimed after leaving a challenge' };
    }

    if (participant.rewardClaimed) {
        return { error: 'reward has already been claimed' };
    }

    if (!isRewardClaimable(challenge)) {
        return { error: 'reward can only be claimed after the challenge ends' };
    }

    if (participant.daysCompleted < 1) {
        return {
            error: 'You need to complete at least one challenge day to receive a reward.',
            code: 'CHALLENGE_REWARD_MINIMUM_PROGRESS',
        };
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

