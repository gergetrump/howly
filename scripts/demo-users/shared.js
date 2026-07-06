import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SEED_PATH = path.resolve(__dirname, '../../data/habit-taxonomy.seed.json');

export const DEMO_EMAIL_DOMAIN = 'howly.demo';
export const DEMO_EMAIL_REGEX = /^seed\+[0-9]+@howly\.demo$/i;
export const DEMO_PASSWORD = 'HowlyDemo1!';
export const DEFAULT_PREMIUM_RATE = 0.75;
export const DEFAULT_CHALLENGE_COUNT = 40;
export const DEFAULT_HISTORY_DAYS = 60;
export const HISTORY_BUFFER_DAYS = 7;
export const MAX_CHALLENGES_PER_CREATOR = 3;

export const COMPANION_TYPES = ['wolf', 'panda', 'bear'];
export const MILESTONE_INTERVAL_DAYS = 10;
export const MILESTONE_VISIBLE_HOURS = 30 * 24;

const CATEGORY_ICONS = {
    movement: '💪',
    nutrition: '🥗',
    sleep: '😴',
    mindfulness: '🧘',
    productivity: '📋',
    learning: '📖',
    health: '❤️',
    'personal-care': '🧴',
    social: '👋',
    home: '🏠',
    finance: '💰',
};

const COMPANION_NAMES = [
    'Howly', 'Buddy', 'Scout', 'Luna', 'Nova', 'Pip', 'Echo', 'Maple',
    'River', 'Sage', 'Pixel', 'Mochi', 'Blaze', 'Willow', 'Cosmo',
];

const FIRST_NAMES = [
    'Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn',
    'Avery', 'Blake', 'Cameron', 'Drew', 'Emery', 'Finley', 'Harper',
    'Jamie', 'Kai', 'Logan', 'Noah', 'Parker', 'Reese', 'Rowan', 'Skyler',
    'Sydney', 'Tatum', 'Wren', 'Zoe', 'Maya', 'Leo', 'Nina',
];

const LAST_NAMES = [
    'Chen', 'Patel', 'Kim', 'Nguyen', 'Garcia', 'Smith', 'Johnson', 'Brown',
    'Martinez', 'Lee', 'Wilson', 'Anderson', 'Thomas', 'Jackson', 'White',
    'Harris', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'King', 'Wright',
    'Scott', 'Green', 'Adams', 'Baker', 'Hill', 'Rivera', 'Campbell',
];

export function assertDemoSeedAllowed() {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
        throw new Error(
            'Refusing to run demo user scripts in production. Set ALLOW_DEMO_SEED=true to override.',
        );
    }
}

export function parseSeedArgs(argv = process.argv.slice(2)) {
    const options = {
        count: 30,
        days: DEFAULT_HISTORY_DAYS,
        friends: 8,
        friendUserId: process.env.DEMO_FRIEND_USER_ID ?? null,
        premiumRate: DEFAULT_PREMIUM_RATE,
        challenges: DEFAULT_CHALLENGE_COUNT,
    };

    for (const arg of argv) {
        if (arg.startsWith('--count=')) {
            options.count = Number.parseInt(arg.slice('--count='.length), 10);
        } else if (arg.startsWith('--days=')) {
            options.days = Number.parseInt(arg.slice('--days='.length), 10);
        } else if (arg.startsWith('--friends=')) {
            options.friends = Number.parseInt(arg.slice('--friends='.length), 10);
        } else if (arg.startsWith('--friend-user-id=')) {
            options.friendUserId = arg.slice('--friend-user-id='.length).trim() || null;
        } else if (arg.startsWith('--premium-rate=')) {
            options.premiumRate = Number.parseFloat(arg.slice('--premium-rate='.length));
        } else if (arg.startsWith('--challenges=')) {
            options.challenges = Number.parseInt(arg.slice('--challenges='.length), 10);
        } else if (arg === '--help' || arg === '-h') {
            options.help = true;
        }
    }

    if (!Number.isFinite(options.count) || options.count < 1) {
        throw new Error('--count must be a positive integer');
    }
    if (!Number.isFinite(options.days) || options.days < 1) {
        throw new Error('--days must be a positive integer');
    }
    if (!Number.isFinite(options.friends) || options.friends < 0) {
        throw new Error('--friends must be a non-negative integer');
    }
    if (!Number.isFinite(options.premiumRate) || options.premiumRate < 0 || options.premiumRate > 1) {
        throw new Error('--premium-rate must be between 0 and 1');
    }
    if (options.challenges !== null && (!Number.isFinite(options.challenges) || options.challenges < 0)) {
        throw new Error('--challenges must be a non-negative integer');
    }

    return options;
}

export function printSeedHelp(scriptName) {
    console.log(`Usage: node scripts/${scriptName} [options]

Options:
  --count=30              Number of demo users to create
  --days=60               Days of check-in history (default 60 for community trend deltas)
  --friends=8             Demo users to friend with --friend-user-id
  --friend-user-id=ID     Real user to connect with demo users (or DEMO_FRIEND_USER_ID env)
  --premium-rate=0.75     Share of demo users with Premium (default 0.75)
  --challenges=40          Number of challenges to create (default 40)
  --help                  Show this help

Environment:
  ALLOW_DEMO_SEED=true    Required to run when NODE_ENV=production
  DEMO_FRIEND_USER_ID     Default friend target user id

Examples:
  npm run seed:demo-users
  npm run seed:demo-users -- --count=50 --days=30 --friend-user-id=665a1b2c3d4e5f6789012345
  npm run clean:demo-users
`);
}

export function demoEmail(index) {
    return `seed+${String(index).padStart(3, '0')}@${DEMO_EMAIL_DOMAIN}`;
}

export function buildFriendshipPair(firstUserId, secondUserId) {
    const [userA, userB] = [firstUserId.toString(), secondUserId.toString()].sort();
    return { userA, userB };
}

export function pickRandom(items, random = Math.random) {
    return items[Math.floor(random() * items.length)];
}

export function shuffle(items, random = Math.random) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
}

export function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

export function startOfDay(date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

export function toDateKey(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

export function getIsoWeekYear(date) {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
    return utcDate.getUTCFullYear();
}

export function getIsoWeek(date) {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const dayInMs = 24 * 60 * 60 * 1000;
    return Math.ceil((((utcDate - yearStart) / dayInMs) + 1) / 7);
}

export function getPeriodKeyForHabit(habit, date = new Date()) {
    if (habit.frequency === 'Weekly') {
        return `${getIsoWeekYear(date)}-W${String(getIsoWeek(date)).padStart(2, '0')}`;
    }

    if (habit.frequency === 'Monthly') {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    return toDateKey(date);
}

export function randomCheckInTime(day, random = Math.random) {
    const completedAt = startOfDay(day);
    const hour = 6 + Math.floor(random() * 15);
    const minute = Math.floor(random() * 60);
    completedAt.setHours(hour, minute, 0, 0);
    return completedAt;
}

export async function loadTaxonomySeed() {
    const raw = await readFile(SEED_PATH, 'utf8');
    return JSON.parse(raw);
}

export function buildCategoryLabelMap(categories = []) {
    return Object.fromEntries(
        categories.map((category) => [category.key, category.label]),
    );
}

export function pickCanonicalHabits(canonicalHabits, categoryLabels, count, random = Math.random) {
    const active = canonicalHabits.filter((entry) => !entry.status || entry.status === 'active');
    const byCategory = new Map();

    for (const entry of active) {
        if (!categoryLabels[entry.categoryKey]) {
            continue;
        }
        const bucket = byCategory.get(entry.categoryKey) ?? [];
        bucket.push(entry);
        byCategory.set(entry.categoryKey, bucket);
    }

    const categories = shuffle([...byCategory.keys()], random);
    const selected = [];
    const usedKeys = new Set();

    for (const categoryKey of categories) {
        if (selected.length >= count) {
            break;
        }

        const candidates = shuffle(byCategory.get(categoryKey) ?? [], random);
        const entry = candidates.find((candidate) => !usedKeys.has(candidate.key));
        if (!entry) {
            continue;
        }

        usedKeys.add(entry.key);
        selected.push({
            ...entry,
            categoryLabel: categoryLabels[entry.categoryKey],
        });
    }

    while (selected.length < count) {
        const entry = pickRandom(active, random);
        if (usedKeys.has(entry.key)) {
            continue;
        }
        usedKeys.add(entry.key);
        selected.push({
            ...entry,
            categoryLabel: categoryLabels[entry.categoryKey],
        });
    }

    return selected.slice(0, count);
}

export function buildDemoUsername(firstName, lastName, index, usedUsernames = null) {
    const first = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const last = lastName.toLowerCase().replace(/[^a-z]/g, '');
    const numberSuffix = String(10 + ((index * 37) % 89));
    const yearishSuffix = String(91 + (index % 9));

    const candidates = [
        `${first}${last}`,
        `${first}.${last}`,
        `${first}_${last}`,
        `${first.slice(0, 1)}${last}`,
        `${first}${last.slice(0, 1)}${yearishSuffix}`,
        `${first}${numberSuffix}`,
        `${first.slice(0, 1)}.${last}`,
        `${first}${last.slice(0, 4)}${numberSuffix.slice(-1)}`,
    ]
        .map((candidate) => candidate.slice(0, 30))
        .filter((candidate) => candidate.length >= 3);

    for (const candidate of candidates) {
        if (!usedUsernames || !usedUsernames.has(candidate)) {
            usedUsernames?.add(candidate);
            return candidate;
        }
    }

    const fallback = `${first}${last}${index}`.slice(0, 30);
    usedUsernames?.add(fallback);
    return fallback;
}

export function buildDemoIdentity(index, random = Math.random, usedUsernames = null) {
    const firstName = FIRST_NAMES[(index - 1) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
    const username = buildDemoUsername(firstName, lastName, index, usedUsernames);

    return {
        firstName,
        lastName,
        username,
        email: demoEmail(index),
        companionType: COMPANION_TYPES[(index - 1) % COMPANION_TYPES.length],
        companionName: COMPANION_NAMES[(index - 1) % COMPANION_NAMES.length],
    };
}

export function habitIconForCategory(categoryKey) {
    return CATEGORY_ICONS[categoryKey] ?? '🎯';
}

function fillDescriptionTemplate(template, values) {
    return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

const GENERIC_HABIT_DESCRIPTIONS = [
    'Trying to make {label} a daily non-negotiable.',
    'Keeping it simple. Just show up for {label} every day.',
    'Small steps: one {label} session at a time.',
    'Part of my routine now. No streak pressure, just consistency.',
    'Helps me stay on track through busy weeks.',
];

const CATEGORY_HABIT_DESCRIPTIONS = {
    movement: [
        'Quick {label} session. No fixed pace or distance, just move.',
        'Moving daily keeps my energy up; {label} is my go-to.',
        'Before the day gets loud, I fit in {label}.',
    ],
    nutrition: [
        'One daily win for how I eat and drink.',
        'Building a steady {label} habit without overthinking it.',
        'Small nutrition upgrade I can actually stick with.',
    ],
    sleep: [
        'Protecting my evenings so {label} happens on time.',
        'Better nights start with this daily wind-down.',
        'Trying to make {label} automatic before bed.',
    ],
    mindfulness: [
        'Ten quiet minutes for {label}. Helps me reset.',
        'A calm pause in the middle of full days.',
        'Less scrolling, more {label}.',
    ],
    productivity: [
        '{label} first thing so the rest of the day flows.',
        'One focused block daily. {label} keeps me organized.',
        'Tiny productivity habit that compounds over time.',
    ],
    learning: [
        'Learning in small daily doses. {label} fits anywhere.',
        'Books, skills, curiosity: {label} is my daily slot.',
        'Twenty minutes of {label} beats zero minutes.',
    ],
    health: [
        'Preventive habit I want to keep long term.',
        '{label} is my check-in with overall wellbeing.',
        'Simple health routine I can repeat every day.',
    ],
    'personal-care': [
        'Self-maintenance I used to skip. Not anymore.',
        'Feels good to stay on top of {label}.',
        'Quick daily {label}; future me says thanks.',
    ],
    social: [
        'Relationships need reps. {label} is mine.',
        'Staying connected on purpose, not by accident.',
        'A small daily nudge to reach out and show up.',
    ],
    home: [
        'Ten minutes of {label} beats a chaotic weekend reset.',
        'Keeping home manageable one day at a time.',
        'Tiny chore habit so clutter does not pile up.',
    ],
    finance: [
        'Money mindfulness in five minutes a day.',
        '{label} keeps spending and saving visible.',
        'Boring but powerful: tracking {label} daily.',
    ],
};

const GENERIC_CHALLENGE_DESCRIPTIONS = [
    'Join us for {days} days of {label}. Accountability makes it stick.',
    'Building a {label} streak together. All levels welcome.',
    '{days}-day push to make {label} part of everyday life.',
    'Who\'s in? Let\'s cheer each other on.',
    'Friendly group challenge: {label} every day for {days} days.',
];

const CATEGORY_CHALLENGE_DESCRIPTIONS = {
    movement: [
        'Move with us for {days} days. Show up how you can, no leaderboard ego.',
        'Sweat together: daily {label} whether it is a walk or a workout.',
    ],
    nutrition: [
        'Fuel better as a group: {days} days of honest {label} check-ins.',
        'No diet wars, just daily {label} and mutual support.',
    ],
    sleep: [
        'Better rest starts tonight. {days} days prioritizing {label}.',
        'Wind down together: {label} every evening for {days} days.',
    ],
    mindfulness: [
        'Quiet minds, busy lives. {days} days of shared {label}.',
        'Calm is a team sport. Join the {days}-day {label} challenge.',
    ],
    productivity: [
        'Ship small wins daily: {days} days of focused {label}.',
        'Accountability squad for {label}: {days} days, no excuses.',
    ],
    learning: [
        'Curious minds unite. {days} days of daily {label}.',
        'Learn something every day: {days}-day {label} challenge.',
    ],
    health: [
        'Health habits stick better together. {days} days of {label}.',
        'Preventive care as a group: join the {days}-day challenge.',
    ],
    'personal-care': [
        'Self-care is easier with company. {days} days of {label}.',
        'Glow-up energy: daily {label} for {days} days straight.',
    ],
    social: [
        'Connection challenge: {days} days of intentional {label}.',
        'Reach out, show up, repeat for {days} days together.',
    ],
    home: [
        'Tidy home, clearer head. {days} days of {label}.',
        'Chores are lighter when we do them together for {days} days.',
    ],
    finance: [
        'Money clarity challenge: {days} days tracking {label}.',
        'Build better money habits. Join us for {days} days of {label}.',
    ],
};

export function buildPersonalHabitDescription(canonicalEntry, random = Math.random) {
    const label = canonicalEntry.label;
    const categoryTemplates = CATEGORY_HABIT_DESCRIPTIONS[canonicalEntry.categoryKey] ?? [];
    const pool = [
        ...categoryTemplates.map((template) => fillDescriptionTemplate(template, { label })),
        ...GENERIC_HABIT_DESCRIPTIONS.map((template) => fillDescriptionTemplate(template, { label })),
    ];

    return pickRandom(pool, random);
}

export function buildPersonalChallengeDescription(canonicalEntry, durationDays, random = Math.random) {
    const label = canonicalEntry.label.toLowerCase();
    const categoryTemplates = CATEGORY_CHALLENGE_DESCRIPTIONS[canonicalEntry.categoryKey] ?? [];
    const pool = [
        ...categoryTemplates.map((template) => fillDescriptionTemplate(template, { label, days: durationDays })),
        ...GENERIC_CHALLENGE_DESCRIPTIONS.map((template) => fillDescriptionTemplate(template, { label, days: durationDays })),
    ];

    return pickRandom(pool, random).slice(0, 200);
}

export function buildHabitPayload(canonicalEntry, ownerId, createdAt, random = Math.random) {
    return {
        title: canonicalEntry.label,
        description: buildPersonalHabitDescription(canonicalEntry, random),
        icon: habitIconForCategory(canonicalEntry.categoryKey),
        type: 'boolean',
        frequency: 'Daily',
        category: canonicalEntry.categoryLabel,
        taxonomy: {
            categoryKey: canonicalEntry.categoryKey,
            subcategoryKey: canonicalEntry.subcategoryKey,
            canonicalHabitKey: canonicalEntry.key,
            score: 0.92,
            assignedAt: createdAt,
        },
        source: 'manual',
        ownerId,
        createdAt,
        updatedAt: createdAt,
    };
}

export function buildCheckInDocs({ userId, habit, dates, random = Math.random }) {
    return dates.map((day) => {
        const completedAt = randomCheckInTime(day, random);
        return {
            user: userId,
            habit: habit._id,
            completedAt,
            periodKey: getPeriodKeyForHabit(habit, completedAt),
            categoryKey: habit.taxonomy?.categoryKey ?? null,
            categoryLabel: habit.category ?? null,
            canonicalHabitKey: habit.taxonomy?.canonicalHabitKey ?? null,
        };
    });
}

export function resolveUserBaseConsistency(userIndex, random = Math.random) {
    const spread = 0.32 + ((userIndex * 17) % 45) / 100;
    const jitter = (random() - 0.5) * 0.08;

    return Math.min(0.88, Math.max(0.28, spread + jitter));
}

const CATEGORY_TREND_ORDER = [
    'movement',
    'nutrition',
    'sleep',
    'mindfulness',
    'productivity',
    'learning',
    'health',
    'personal-care',
    'social',
    'home',
    'finance',
    'creativity',
    'digital-wellbeing',
    'outdoors',
];

const WEEK_TREND_BY_CATEGORY = Object.fromEntries(
    CATEGORY_TREND_ORDER.map((key, index) => {
        const pattern = ['up', 'down', 'flat', 'up', 'down', 'flat', 'down', 'up', 'flat', 'down', 'up', 'down', 'up', 'flat'];
        return [key, pattern[index]];
    }),
);

const MONTH_TREND_BY_CATEGORY = Object.fromEntries(
    CATEGORY_TREND_ORDER.map((key, index) => {
        const pattern = ['down', 'up', 'flat', 'down', 'up', 'down', 'flat', 'down', 'up', 'flat', 'up', 'up', 'down', 'flat'];
        return [key, pattern[index]];
    }),
);

function fallbackTrend(categoryKey, salt) {
    const slot = [...categoryKey].reduce((sum, char) => sum + char.charCodeAt(0), 0) + salt;
    return ['up', 'down', 'flat'][slot % 3];
}

function invertTrend(direction) {
    if (direction === 'up') {
        return 'down';
    }

    if (direction === 'down') {
        return 'up';
    }

    return 'flat';
}

export function resolveHabitTrendProfile(userIndex, habitIndex, categoryKey = '') {
    const week = WEEK_TREND_BY_CATEGORY[categoryKey] ?? fallbackTrend(categoryKey, 1);
    const month = MONTH_TREND_BY_CATEGORY[categoryKey] ?? fallbackTrend(categoryKey, 2);

    if ((userIndex + habitIndex) % 5 === 0) {
        return {
            week: invertTrend(week),
            month: invertTrend(month),
        };
    }

    return { week, month };
}

function trendMultiplier(direction, isCurrentWindow) {
    if (direction === 'up') {
        return isCurrentWindow ? 1.38 : 0.62;
    }

    if (direction === 'down') {
        return isCurrentWindow ? 0.62 : 1.38;
    }

    return 1;
}

function consistencyForDayOffset(offsetFromToday, baseConsistency, trendProfile) {
    let multiplier = 1;

    if (offsetFromToday < 7) {
        multiplier *= trendMultiplier(trendProfile.week, true);
    } else if (offsetFromToday < 14) {
        multiplier *= trendMultiplier(trendProfile.week, false);
    }

    if (offsetFromToday < 30) {
        multiplier *= trendMultiplier(trendProfile.month, true);
    } else if (offsetFromToday < 60) {
        multiplier *= trendMultiplier(trendProfile.month, false);
    }

    return Math.min(0.95, Math.max(0.15, baseConsistency * multiplier));
}

export function generateCheckInDates({
    days,
    consistency,
    random = Math.random,
    trendProfile = { week: 'flat', month: 'flat' },
}) {
    const today = startOfDay(new Date());
    const dates = [];

    for (let offset = days - 1; offset >= 0; offset -= 1) {
        const day = addDays(today, -offset);
        const dayConsistency = consistencyForDayOffset(offset, consistency, trendProfile);

        if (random() <= dayConsistency) {
            dates.push(day);
        }
    }

    if (!dates.some((day) => toDateKey(day) === toDateKey(today)) && random() > 0.25) {
        dates.push(today);
    }

    return dates.sort((left, right) => left - right);
}

export function resolveAccountCreatedAt(historyDays, random = Math.random) {
    const bufferDays = historyDays + HISTORY_BUFFER_DAYS;
    const earliest = addDays(startOfDay(new Date()), -bufferDays);
    const jitter = Math.floor(random() * 4);

    return addDays(earliest, jitter);
}

export function shouldGrantPremium(random = Math.random, premiumRate = DEFAULT_PREMIUM_RATE) {
    return random() < premiumRate;
}

export function resolveChallengeTargetCount(userCount, explicitCount = DEFAULT_CHALLENGE_COUNT) {
    if (!Number.isFinite(explicitCount) || explicitCount < 0) {
        return DEFAULT_CHALLENGE_COUNT;
    }

    return explicitCount;
}

export function toChallengeUser(user) {
    return {
        id: user._id.toString(),
        role: user.role ?? 'user',
    };
}

const CHALLENGE_DURATION_OPTIONS = [30, 30, 30, 30, 30, 45, 60, 30, 45, 21];

export function buildChallengeDurationDays(random = Math.random) {
    return pickRandom(CHALLENGE_DURATION_OPTIONS, random);
}

export function buildChallengeStartsAt(durationDays, random = Math.random) {
    const maxStartedDaysAgo = Math.max(1, Math.floor(durationDays * 0.35));

    return addDays(startOfDay(new Date()), -Math.floor(random() * (maxStartedDaysAgo + 1)));
}

export function getChallengeElapsedDays(startsAt, durationDays, now = new Date()) {
    const elapsedDays = Math.floor((startOfDay(now) - startOfDay(startsAt)) / (24 * 60 * 60 * 1000)) + 1;

    return Math.min(Math.max(elapsedDays, 1), durationDays);
}

export function generateChallengeCheckInDates({
    startsAt,
    durationDays,
    consistency,
    random = Math.random,
    trendProfile = { week: 'flat', month: 'flat' },
}) {
    const challengeStart = startOfDay(startsAt);
    const elapsedDays = getChallengeElapsedDays(startsAt, durationDays);
    const dates = [];

    for (let dayIndex = 0; dayIndex < elapsedDays; dayIndex += 1) {
        const day = addDays(challengeStart, dayIndex);
        const dayConsistency = consistencyForDayOffset(elapsedDays - 1 - dayIndex, consistency, trendProfile);

        if (random() <= dayConsistency) {
            dates.push(day);
        }
    }

    if (dates.length === 0 && elapsedDays > 0) {
        dates.push(addDays(challengeStart, elapsedDays - 1));
    }

    return dates;
}

export function buildChallengeInput(canonicalEntry, random = Math.random) {
    const durationDays = buildChallengeDurationDays(random);
    const startsAt = buildChallengeStartsAt(durationDays, random);
    const visibility = random() < 0.7 ? 'public' : 'friends';
    const titles = [
        `${durationDays}-Day ${canonicalEntry.label} Challenge`,
        `Daily ${canonicalEntry.label}`,
        `${canonicalEntry.label} Crew`,
    ];

    return {
        title: pickRandom(titles, random),
        description: buildPersonalChallengeDescription(canonicalEntry, durationDays, random),
        habitTemplate: {
            title: canonicalEntry.label,
            description: buildPersonalHabitDescription(canonicalEntry, random),
            icon: habitIconForCategory(canonicalEntry.categoryKey),
            type: 'boolean',
            frequency: 'Daily',
            category: canonicalEntry.categoryLabel,
        },
        frequency: 'daily',
        durationDays,
        visibility,
        startsAt,
    };
}
