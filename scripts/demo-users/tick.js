import User from '../../src/features/users/user.model.js';
import Habit from '../../src/features/habits/habit.model.js';
import HabitCheckIn from '../../src/features/analytics/habitCheckIn.model.js';
import Challenge from '../../src/features/challenges/challenge.model.js';
import ChallengeParticipant from '../../src/features/challenges/challengeParticipant.model.js';
import {
    completeHabit,
    isCompletedForPeriod,
    isDueToday,
} from '../../src/features/habits/habit.service.js';
import {
    DEMO_EMAIL_REGEX,
    resolveUserBaseConsistency,
    startOfDay,
    toDateKey,
} from './shared.js';

export function parseTickArgs(argv = process.argv.slice(2)) {
    const options = {
        dryRun: false,
        help: false,
    };

    for (const arg of argv) {
        if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg === '--help' || arg === '-h') {
            options.help = true;
        }
    }

    return options;
}

export function printTickHelp() {
    console.log(`Usage: node scripts/tick-demo-users.js [options]

Advances demo users by completing habits and challenge progress for the current
period. Safe to run daily via cron — idempotent and demo-only (never touches
real users or deletes data).

Options:
  --dry-run   Log planned completions without writing anything
  --help      Show this help

Environment:
  ALLOW_DEMO_SEED=true    Required to run when NODE_ENV=production

Examples:
  npm run tick:demo-users
  npm run tick:demo-users -- --dry-run

Cron example (daily at 8am):
  0 8 * * * cd /path/to/Backend && ALLOW_DEMO_SEED=true npm run tick:demo-users
`);
}

export function demoUserIndexFromEmail(email) {
    const match = email.match(/^seed\+([0-9]+)@howly\.demo$/i);
    return match ? Number.parseInt(match[1], 10) : 1;
}

export function createDailyRandom(userIndex, habitId, dateKey) {
    const habitSalt = habitId.toString().slice(-8);
    const dateSalt = dateKey.replace(/-/g, '');
    let roll = 0;

    return () => {
        roll += 1;
        const value = Math.sin((userIndex * 997) + (Number(dateSalt) % 100000) + (Number(habitSalt) % 100000) + (roll * 131)) * 10000;
        return value - Math.floor(value);
    };
}

export function isChallengeTickEligible(challenge, participant, now = new Date()) {
    if (!challenge || !participant) {
        return false;
    }

    if (participant.status === 'completed' || participant.status === 'left' || participant.status === 'failed') {
        return false;
    }

    if (challenge.status === 'completed' || challenge.status === 'failed') {
        return false;
    }

    if (challenge.endsAt <= now || challenge.startsAt > now) {
        return false;
    }

    if (participant.daysCompleted >= challenge.durationDays) {
        return false;
    }

    return true;
}

export function resolveTickProbability({ userIndex, habit, random }) {
    const baseConsistency = resolveUserBaseConsistency(userIndex, random);
    const streakCount = habit.streakCount ?? 0;
    const isChallenge = habit.source === 'challenge';

    let probability = isChallenge
        ? 0.9 + (baseConsistency * 0.06)
        : 0.78 + (baseConsistency * 0.12);

    if (streakCount >= 10) {
        probability += 0.06;
    } else if (streakCount >= 5) {
        probability += 0.04;
    } else if (streakCount >= 2) {
        probability += 0.02;
    }

    if (isChallenge) {
        probability += 0.02;
    }

    return Math.min(0.98, Math.max(0.72, probability));
}

export function shouldTickHabit({
    userIndex,
    habit,
    random,
    challenge = null,
    participant = null,
    now = new Date(),
}) {
    if (isCompletedForPeriod(habit)) {
        return false;
    }

    if (habit.frequency === 'Custom' && !isDueToday(habit)) {
        return false;
    }

    if (habit.source === 'challenge') {
        if (!isChallengeTickEligible(challenge, participant, now)) {
            return false;
        }
    }

    const probability = resolveTickProbability({ userIndex, habit, random });
    return random() <= probability;
}

async function loadDemoUsers() {
    return User.find({
        email: DEMO_EMAIL_REGEX,
        isDeleted: { $ne: true },
    })
        .select('_id email username')
        .lean();
}

async function loadHabitsForUsers(userIds) {
    return Habit.find({
        ownerId: { $in: userIds },
        deletedAt: null,
    }).lean();
}

async function loadChallengeContext(habitIds) {
    const participants = await ChallengeParticipant.find({
        habit: { $in: habitIds },
        status: { $in: ['active', 'completed'] },
    }).lean();

    const challengeIds = [...new Set(participants.map((participant) => participant.challenge.toString()))];
    const challenges = challengeIds.length
        ? await Challenge.find({ _id: { $in: challengeIds } }).lean()
        : [];

    const challengeById = new Map(challenges.map((challenge) => [challenge._id.toString(), challenge]));
    const participantByHabitId = new Map(
        participants.map((participant) => [participant.habit.toString(), participant]),
    );

    return { challengeById, participantByHabitId };
}

export async function tickDemoUsers({ dryRun = false, now = new Date(), forceComplete = false } = {}) {
    const dateKey = toDateKey(startOfDay(now));
    const demoUsers = await loadDemoUsers();

    if (demoUsers.length === 0) {
        return {
            dateKey,
            dryRun,
            demoUsers: 0,
            habitsSeen: 0,
            alreadyCompleted: 0,
            skipped: 0,
            planned: 0,
            completed: 0,
            failed: 0,
            errors: [],
        };
    }

    const userIds = demoUsers.map((user) => user._id);
    const habits = await loadHabitsForUsers(userIds);
    const challengeHabitIds = habits
        .filter((habit) => habit.source === 'challenge')
        .map((habit) => habit._id);
    const { challengeById, participantByHabitId } = await loadChallengeContext(challengeHabitIds);

    const stats = {
        dateKey,
        dryRun,
        demoUsers: demoUsers.length,
        habitsSeen: habits.length,
        alreadyCompleted: 0,
        skipped: 0,
        planned: 0,
        completed: 0,
        failed: 0,
        errors: [],
    };

    for (const user of demoUsers) {
        const userIndex = demoUserIndexFromEmail(user.email);
        const userHabits = habits.filter((habit) => habit.ownerId.toString() === user._id.toString());

        for (const habit of userHabits) {
            if (isCompletedForPeriod(habit)) {
                stats.alreadyCompleted += 1;
                continue;
            }

            const participant = habit.source === 'challenge'
                ? participantByHabitId.get(habit._id.toString()) ?? null
                : null;
            const challenge = participant
                ? challengeById.get(participant.challenge.toString()) ?? null
                : null;

            const random = createDailyRandom(userIndex, habit._id, dateKey);
            const willTick = forceComplete || shouldTickHabit({
                userIndex,
                habit,
                random,
                challenge,
                participant,
                now,
            });

            if (!willTick) {
                stats.skipped += 1;
                continue;
            }

            if (dryRun) {
                stats.planned += 1;
                continue;
            }

            try {
                await completeHabit(habit._id, user._id);
                stats.completed += 1;
            } catch (error) {
                stats.failed += 1;
                stats.errors.push({
                    user: user.username,
                    habitId: habit._id.toString(),
                    message: error.message,
                });
            }
        }
    }

    return stats;
}

export async function countNonDemoUsers() {
    return User.countDocuments({ email: { $not: DEMO_EMAIL_REGEX } });
}

export async function countNonDemoCheckIns() {
    const nonDemoUsers = await User.find({ email: { $not: DEMO_EMAIL_REGEX } }).select('_id').lean();
    const nonDemoUserIds = nonDemoUsers.map((user) => user._id);

    if (nonDemoUserIds.length === 0) {
        return 0;
    }

    return HabitCheckIn.countDocuments({ user: { $in: nonDemoUserIds } });
}
