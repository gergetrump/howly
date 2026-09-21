import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '../src/config/database.js';
import User from '../src/features/users/user.model.js';
import Companion from '../src/features/companion/companion.model.js';
import Habit from '../src/features/habits/habit.model.js';
import HabitCheckIn from '../src/features/analytics/habitCheckIn.model.js';
import { Friendship } from '../src/features/social/social.model.js';
import Challenge from '../src/features/challenges/challenge.model.js';
import ChallengeParticipant from '../src/features/challenges/challengeParticipant.model.js';
import { createChallenge, joinChallenge } from '../src/features/challenges/challenge.service.js';
import {
    MilestonePost,
    MILESTONE_VISIBLE_HOURS,
} from '../src/features/milestones/milestone.model.js';
import {
    assertDemoSeedAllowed,
    buildChallengeInput,
    buildCheckInDocs,
    buildDemoIdentity,
    buildFriendshipPair,
    buildHabitPayload,
    buildCategoryLabelMap,
    DEMO_EMAIL_REGEX,
    DEMO_PASSWORD,
    generateChallengeCheckInDates,
    generateCheckInDates,
    loadTaxonomySeed,
    parseSeedArgs,
    pickCanonicalHabits,
    pickRandom,
    printSeedHelp,
    resolveAccountCreatedAt,
    resolveChallengeTargetCount,
    resolveHabitTrendProfile,
    resolveUserBaseConsistency,
    shouldGrantPremium,
    shuffle,
    startOfDay,
    addDays,
    toDateKey,
    toChallengeUser,
    MAX_CHALLENGES_PER_CREATOR,
    MILESTONE_INTERVAL_DAYS,
} from './demo-users/shared.js';

async function ensureNoExistingDemoUsers() {
    const existingCount = await User.countDocuments({ email: DEMO_EMAIL_REGEX });
    if (existingCount > 0) {
        throw new Error(
            `Found ${existingCount} existing demo user(s). Run "npm run clean:demo-users" first.`,
        );
    }
}

async function resolveFriendUser(friendUserId) {
    if (!friendUserId) {
        return null;
    }

    const friendUser = await User.findById(friendUserId).lean();
    if (!friendUser || friendUser.isDeleted) {
        throw new Error(`Friend user not found or deleted: ${friendUserId}`);
    }

    if (DEMO_EMAIL_REGEX.test(friendUser.email)) {
        throw new Error('Friend user must be a real account, not a demo user.');
    }

    return friendUser;
}

async function createDemoUser({ index, passwordHash, createdAt, random, usedUsernames, premiumRate }) {
    const identity = buildDemoIdentity(index, random, usedUsernames);
    const isPremium = shouldGrantPremium(random, premiumRate);
    const premiumUntil = isPremium ? addDays(new Date(), 365) : null;

    const user = await User.create({
        username: identity.username,
        email: identity.email,
        firstName: identity.firstName,
        lastName: identity.lastName,
        passwordHash,
        authProvider: 'local',
        role: 'user',
        isEmailVerified: true,
        emailVerifiedAt: createdAt,
        onboardingCompleted: true,
        isPremium,
        premiumStatus: isPremium ? 'active' : undefined,
        premiumUntil,
        coins: 50 + Math.floor(random() * 150),
        streak: 0,
        createdAt,
        updatedAt: createdAt,
    });

    await Companion.create({
        user: user._id,
        name: identity.companionName,
        type: identity.companionType,
        createdAt,
        updatedAt: createdAt,
    });

    return user;
}

async function seedCheckInsForHabit({
    user,
    habit,
    days,
    consistency,
    milestoneStreak = null,
    trendProfile,
    random,
}) {
    let dates = generateCheckInDates({ days, consistency, random, trendProfile });

    if (milestoneStreak && milestoneStreak >= MILESTONE_INTERVAL_DAYS) {
        const today = startOfDay(new Date());
        const milestoneDates = [];

        for (let streakDay = milestoneStreak - 1; streakDay >= 0; streakDay -= 1) {
            milestoneDates.push(addDays(today, -streakDay));
        }

        const dateKeys = new Set(dates.map((date) => toDateKey(date)));
        for (const date of milestoneDates) {
            const key = toDateKey(date);
            if (!dateKeys.has(key)) {
                dates.push(date);
                dateKeys.add(key);
            }
        }

        dates = dates.sort((left, right) => left - right);
    }

    const checkInDocs = buildCheckInDocs({
        userId: user._id,
        habit,
        dates,
        random,
    });

    if (checkInDocs.length === 0) {
        return { checkIns: 0, streakCount: 0, lastCompletedAt: null };
    }

    await HabitCheckIn.insertMany(checkInDocs, { ordered: false });

    const lastCompletedAt = checkInDocs[checkInDocs.length - 1].completedAt;
    let streakCount = 1;

    if (milestoneStreak && milestoneStreak >= MILESTONE_INTERVAL_DAYS) {
        streakCount = milestoneStreak;
    } else {
        for (let index = checkInDocs.length - 2; index >= 0; index -= 1) {
            const current = startOfDay(checkInDocs[index + 1].completedAt);
            const previous = startOfDay(checkInDocs[index].completedAt);
            const diffDays = Math.round((current - previous) / (24 * 60 * 60 * 1000));
            if (diffDays === 1) {
                streakCount += 1;
            } else {
                break;
            }
        }
    }

    await Habit.findByIdAndUpdate(habit._id, {
        streakCount,
        lastCompletedAt,
    });

    return {
        checkIns: checkInDocs.length,
        streakCount,
        lastCompletedAt,
    };
}

async function createMilestoneIfEligible(habit, streakCount) {
    if (
        streakCount < MILESTONE_INTERVAL_DAYS
        || streakCount % MILESTONE_INTERVAL_DAYS !== 0
    ) {
        return null;
    }

    const visibleUntil = new Date(Date.now() + MILESTONE_VISIBLE_HOURS * 60 * 60 * 1000);

    return MilestonePost.findOneAndUpdate(
        {
            habit: habit._id,
            streakDays: streakCount,
        },
        {
            user: habit.ownerId,
            habit: habit._id,
            habitTitle: habit.title,
            streakDays: streakCount,
            visibleUntil,
        },
        {
            upsert: true,
            returnDocument: 'after',
            setDefaultsOnInsert: true,
        },
    );
}

async function createFriendships(demoUsers, friendUser, friendCount) {
    let created = 0;

    if (friendUser) {
        const friendTargets = demoUsers.slice(0, Math.min(friendCount, demoUsers.length));
        for (const demoUser of friendTargets) {
            const pair = buildFriendshipPair(friendUser._id, demoUser._id);
            const result = await Friendship.updateOne(pair, { $setOnInsert: pair }, { upsert: true });
            if (result.upsertedCount > 0 || result.upsertedId) {
                created += 1;
            }
        }
    }

    for (const demoUser of demoUsers) {
        const candidates = shuffle(
            demoUsers.filter((candidate) => candidate._id.toString() !== demoUser._id.toString()),
        );
        const friendTotal = 2 + Math.floor(Math.random() * 3);

        for (const candidate of candidates.slice(0, friendTotal)) {
            const pair = buildFriendshipPair(demoUser._id, candidate._id);
            const result = await Friendship.updateOne(pair, { $setOnInsert: pair }, { upsert: true });
            if (result.upsertedCount > 0 || result.upsertedId) {
                created += 1;
            }
        }
    }

    return created;
}

async function buildFriendIdMap(demoUsers) {
    const userIds = demoUsers.map((user) => user._id);
    const friendships = await Friendship.find({
        $or: [{ userA: { $in: userIds } }, { userB: { $in: userIds } }],
    }).lean();

    const friendIdsByUser = new Map(
        demoUsers.map((user) => [user._id.toString(), new Set()]),
    );

    friendships.forEach((friendship) => {
        const userA = friendship.userA.toString();
        const userB = friendship.userB.toString();
        friendIdsByUser.get(userA)?.add(userB);
        friendIdsByUser.get(userB)?.add(userA);
    });

    return friendIdsByUser;
}

async function seedChallengeParticipantProgress({
    participantId,
    userId,
    habitId,
    challenge,
    categoryKey,
    userIndex,
    random,
}) {
    if (!participantId || !habitId) {
        return 0;
    }

    const habit = await Habit.findById(habitId);
    if (!habit) {
        return 0;
    }

    const resolvedCategoryKey = categoryKey
        ?? habit.taxonomy?.categoryKey
        ?? 'movement';

    if (!habit.taxonomy?.categoryKey) {
        habit.taxonomy = {
            ...(habit.taxonomy ?? {}),
            categoryKey: resolvedCategoryKey,
        };
    }

    const consistency = 0.45 + random() * 0.4;
    const trendProfile = resolveHabitTrendProfile(userIndex ?? 1, 0, resolvedCategoryKey);
    const checkInDates = generateChallengeCheckInDates({
        startsAt: challenge.startsAt,
        durationDays: challenge.durationDays,
        consistency,
        random,
        trendProfile,
    });
    const progressDays = Math.min(challenge.durationDays, checkInDates.length);

    const checkInDocs = buildCheckInDocs({
        userId,
        habit,
        dates: checkInDates,
        random,
    });

    if (checkInDocs.length > 0) {
        await HabitCheckIn.insertMany(checkInDocs, { ordered: false });
    }

    await Promise.all([
        ChallengeParticipant.findByIdAndUpdate(participantId, {
            daysCompleted: progressDays,
            lastCompletedAt: checkInDates[checkInDates.length - 1] ?? null,
            status: progressDays >= challenge.durationDays ? 'completed' : 'active',
        }),
        Habit.findByIdAndUpdate(habit._id, {
            streakCount: progressDays,
            lastCompletedAt: checkInDates[checkInDates.length - 1] ?? null,
        }),
    ]);

    return checkInDocs.length;
}

async function seedDemoChallenges({
    demoUsers,
    taxonomySeed,
    categoryLabels,
    targetCount,
    friendIdsByUser,
}) {
    const premiumUsers = demoUsers.filter((user) => user.isPremium);
    if (premiumUsers.length === 0 || targetCount === 0) {
        return { challenges: 0, participants: 0, checkIns: 0 };
    }

    const canonicalPool = pickCanonicalHabits(
        taxonomySeed.canonicalHabits ?? [],
        categoryLabels,
        Math.min(targetCount, 60),
    );

    const stats = { challenges: 0, participants: 0, checkIns: 0 };
    const creators = shuffle(premiumUsers);
    const createdChallenges = [];
    const joinCountByUser = new Map();
    let canonicalIndex = 0;

    for (const creator of creators) {
        if (stats.challenges >= targetCount) {
            break;
        }

        const random = () => {
            const value = Math.sin(stats.challenges * 503 + canonicalIndex * 89) * 10000;
            return value - Math.floor(value);
        };

        const challengesForCreator = Math.min(
            MAX_CHALLENGES_PER_CREATOR,
            targetCount - stats.challenges,
        );

        for (let challengeIndex = 0; challengeIndex < challengesForCreator; challengeIndex += 1) {
            if (stats.challenges >= targetCount) {
                break;
            }

            const canonicalEntry = canonicalPool[canonicalIndex % canonicalPool.length];
            canonicalIndex += 1;

            const input = buildChallengeInput(canonicalEntry, random);
            const result = await createChallenge(input, toChallengeUser(creator));

            if (result.error) {
                console.warn(`  Skipped challenge for ${creator.username}: ${result.error}`);
                continue;
            }

            stats.challenges += 1;
            const challenge = await Challenge.findById(result.challenge.id);
            stats.participants += 1;

            const creatorCheckIns = await seedChallengeParticipantProgress({
                participantId: result.participant.id,
                userId: creator._id,
                habitId: result.participant.habit,
                challenge,
                categoryKey: canonicalEntry.categoryKey,
                userIndex: demoUsers.findIndex((user) => user._id.equals(creator._id)) + 1,
                random,
            });
            stats.checkIns += creatorCheckIns;

            createdChallenges.push({
                challenge,
                creator,
                input,
                canonicalEntry,
                random,
            });
        }
    }

    const maxJoinsPerUser = 4;

    for (const created of createdChallenges) {
        const { challenge, creator, input, canonicalEntry, random } = created;
        const creatorFriendIds = friendIdsByUser.get(creator._id.toString()) ?? new Set();
        const joinCandidates = shuffle(
            demoUsers.filter((candidate) => candidate._id.toString() !== creator._id.toString()),
        );

        const joinTarget = 2 + Math.floor(random() * 4);
        let joined = 0;

        for (const joiner of joinCandidates) {
            if (joined >= joinTarget) {
                break;
            }

            const joinerKey = joiner._id.toString();
            const currentJoins = joinCountByUser.get(joinerKey) ?? 0;
            if (currentJoins >= maxJoinsPerUser) {
                continue;
            }

            if (input.visibility === 'friends' && !creatorFriendIds.has(joinerKey)) {
                continue;
            }

            const joinResult = await joinChallenge(challenge._id, toChallengeUser(joiner));
            if (joinResult.error || joinResult.notFound || joinResult.forbidden) {
                continue;
            }

            joined += 1;
            joinCountByUser.set(joinerKey, currentJoins + 1);
            stats.participants += 1;

            const joinCheckIns = await seedChallengeParticipantProgress({
                participantId: joinResult.participant.id,
                userId: joiner._id,
                habitId: joinResult.participant.habit,
                challenge,
                categoryKey: canonicalEntry.categoryKey,
                userIndex: demoUsers.findIndex((user) => user._id.equals(joiner._id)) + 1,
                random,
            });
            stats.checkIns += joinCheckIns;
        }
    }

    return stats;
}

async function seedDemoUsers() {
    const options = parseSeedArgs();

    if (options.help) {
        printSeedHelp('seed-demo-users.js');
        return;
    }

    assertDemoSeedAllowed();
    await connectDB();
    await ensureNoExistingDemoUsers();

    const friendUser = await resolveFriendUser(options.friendUserId);
    const taxonomySeed = await loadTaxonomySeed();
    const categoryLabels = buildCategoryLabelMap(taxonomySeed.categories);
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

    const stats = {
        users: 0,
        premiumUsers: 0,
        habits: 0,
        checkIns: 0,
        milestones: 0,
        friendships: 0,
        challenges: 0,
        challengeParticipants: 0,
    };

    const challengeTarget = resolveChallengeTargetCount(options.count, options.challenges);

    const demoUsers = [];
    const usedUsernames = new Set();

    console.log(`Creating ${options.count} demo users with ${options.days} days of history...`);
    console.log(`Target challenges: ${challengeTarget} (${Math.round(options.premiumRate * 100)}% premium)`);

    for (let index = 1; index <= options.count; index += 1) {
        const random = () => {
            const value = Math.sin(index * 997 + demoUsers.length * 131) * 10000;
            return value - Math.floor(value);
        };

        const userCreatedAt = resolveAccountCreatedAt(options.days, random);
        const userBaseConsistency = resolveUserBaseConsistency(index, random);
        const user = await createDemoUser({
            index,
            passwordHash,
            createdAt: userCreatedAt,
            random,
            usedUsernames,
            premiumRate: options.premiumRate,
        });
        demoUsers.push(user);
        stats.users += 1;
        if (user.isPremium) {
            stats.premiumUsers += 1;
        }

        const habitCount = 2 + Math.floor(random() * 3);
        const canonicalEntries = pickCanonicalHabits(
            taxonomySeed.canonicalHabits ?? [],
            categoryLabels,
            habitCount,
            random,
        );

        const isMilestoneUser = index <= Math.max(3, Math.ceil(options.count * 0.25));
        const milestoneStreak = isMilestoneUser
            ? pickRandom([MILESTONE_INTERVAL_DAYS, MILESTONE_INTERVAL_DAYS * 2], random)
            : null;

        for (let habitIndex = 0; habitIndex < canonicalEntries.length; habitIndex += 1) {
            const entry = canonicalEntries[habitIndex];
            const habitCreatedAt = addDays(userCreatedAt, habitIndex);
            const habit = await Habit.create(
                buildHabitPayload(entry, user._id, habitCreatedAt, random),
            );
            stats.habits += 1;

            const consistency = Math.min(
                0.92,
                Math.max(0.25, userBaseConsistency * (0.88 + random() * 0.24)),
            );
            const applyMilestone = habitIndex === 0 ? milestoneStreak : null;
            const trendProfile = resolveHabitTrendProfile(index, habitIndex, entry.categoryKey);
            const result = await seedCheckInsForHabit({
                user,
                habit,
                days: options.days,
                consistency,
                milestoneStreak: applyMilestone,
                trendProfile,
                random,
            });
            stats.checkIns += result.checkIns;

            const milestone = await createMilestoneIfEligible(habit, result.streakCount);
            if (milestone) {
                stats.milestones += 1;
            }
        }

        if (index % 5 === 0 || index === options.count) {
            console.log(`  ${index}/${options.count} users seeded`);
        }
    }

    stats.friendships = await createFriendships(demoUsers, friendUser, options.friends);

    const friendIdsByUser = await buildFriendIdMap(demoUsers);
    const challengeStats = await seedDemoChallenges({
        demoUsers,
        taxonomySeed,
        categoryLabels,
        targetCount: challengeTarget,
        friendIdsByUser,
    });
    stats.challenges = challengeStats.challenges;
    stats.challengeParticipants = challengeStats.participants;
    stats.checkIns += challengeStats.checkIns;

    console.log('\nDemo seed complete.');
    console.log(`  Users:                 ${stats.users} (${stats.premiumUsers} premium)`);
    console.log(`  Habits:                ${stats.habits}`);
    console.log(`  Check-ins:             ${stats.checkIns}`);
    console.log(`  Milestones:            ${stats.milestones}`);
    console.log(`  Friendships:           ${stats.friendships}`);
    console.log(`  Challenges:            ${stats.challenges}`);
    console.log(`  Challenge participants:  ${stats.challengeParticipants}`);

    if (friendUser) {
        console.log(`\nFriended ${Math.min(options.friends, demoUsers.length)} demo users with ${friendUser.username}.`);
    } else {
        console.log('\nTip: pass --friend-user-id=<yourUserId> to populate your Social feed.');
    }

    console.log(`\nAll demo accounts share password: ${DEMO_PASSWORD}`);
    console.log('Emails match pattern: seed+001@howly.demo');
}

seedDemoUsers()
    .catch((error) => {
        console.error('Demo seed failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
