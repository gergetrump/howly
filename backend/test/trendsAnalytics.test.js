import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import Habit from '../src/features/habits/habit.model.js';
import HabitCheckIn from '../src/features/analytics/habitCheckIn.model.js';
import { recordHabitCheckIn } from '../src/features/analytics/analytics.service.js';
import User from '../src/features/users/user.model.js';
import config from '../config.js';

let mongo;
let app;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

async function buildUser(overrides = {}) {
    const suffix = Math.random().toString(36).slice(2, 10);
    return User.create({
        username: overrides.username || `user_${suffix}`,
        email: overrides.email || `user_${suffix}@example.com`,
        firstName: overrides.firstName || 'Test',
        lastName: overrides.lastName || 'User',
        passwordHash: overrides.passwordHash || 'hashed',
        authProvider: overrides.authProvider || 'local',
        isPremium: overrides.isPremium ?? true,
        ...overrides,
    });
}

function authHeader(user) {
    return `Bearer ${signAccessToken(user)}`;
}

function periodKeyForDate(date) {
    return date.toISOString().slice(0, 10);
}

async function createDailyHabit(userId, title, createdAt = new Date()) {
    return Habit.create({
        title,
        type: 'boolean',
        frequency: 'Daily',
        ownerId: userId,
        category: 'Movement',
        createdAt,
        taxonomy: {
            categoryKey: 'movement',
            subcategoryKey: 'cardio',
            canonicalHabitKey: 'run',
            score: 0.9,
            assignedAt: createdAt,
        },
    });
}

async function seedDailyCheckIns(userId, habitId, dayCount) {
    const today = new Date();
    const docs = [];

    for (let offset = 0; offset < dayCount; offset += 1) {
        const completedAt = new Date(today);
        completedAt.setDate(completedAt.getDate() - offset);
        docs.push({
            user: userId,
            habit: habitId,
            completedAt,
            periodKey: periodKeyForDate(completedAt),
        });
    }

    if (docs.length) {
        await HabitCheckIn.create(docs);
    }
}

before(async () => {
    config.jwtSecret = 'test-secret';
    mongo = await MongoMemoryServer.create();
    await connectDB(mongo.getUri());
    app = createApp();
});

afterEach(async () => {
    await Promise.all([
        Habit.deleteMany({}),
        HabitCheckIn.deleteMany({}),
        User.deleteMany({}),
    ]);
});

after(async () => {
    await mongoose.disconnect();
    if (mongo) {
        await mongo.stop();
    }
});

test('GET /api/trends/analytics returns anonymous trends aggregates', async () => {
    const userA = await buildUser({ username: 'user_a', email: 'a@example.com' });
    const userB = await buildUser({ username: 'user_b', email: 'b@example.com' });
    const token = authHeader(userA);
    const completedAt = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 6);
    periodStart.setHours(0, 0, 0, 0);

    const [runHabit, readHabit] = await Promise.all([
        Habit.create({
            title: 'Morning run',
            type: 'boolean',
            frequency: 'Daily',
            ownerId: userA._id,
            createdAt: periodStart,
            category: 'Movement',
            taxonomy: {
                categoryKey: 'movement',
                subcategoryKey: 'cardio',
                canonicalHabitKey: 'run',
                score: 0.9,
                assignedAt: completedAt,
            },
        }),
        Habit.create({
            title: 'Read book',
            type: 'boolean',
            frequency: 'Daily',
            ownerId: userB._id,
            createdAt: periodStart,
            category: 'Learning',
            taxonomy: {
                categoryKey: 'learning',
                subcategoryKey: 'reading',
                canonicalHabitKey: 'read',
                score: 0.88,
                assignedAt: completedAt,
            },
        }),
    ]);

    await HabitCheckIn.create([
        {
            user: userA._id,
            habit: runHabit._id,
            completedAt,
            periodKey: completedAt.toISOString().slice(0, 10),
        },
        {
            user: userA._id,
            habit: runHabit._id,
            completedAt: new Date(completedAt.getTime() - 60_000),
            periodKey: completedAt.toISOString().slice(0, 10),
        },
        {
            user: userB._id,
            habit: readHabit._id,
            completedAt,
            periodKey: completedAt.toISOString().slice(0, 10),
        },
    ]);

    const response = await request(app)
        .get('/api/trends/analytics?period=7d')
        .set('Authorization', token)
        .expect(200);

    assert.equal(response.body.data.period.key, '7d');
    assert.equal(response.body.data.summary.topCategory.categoryKey, 'movement');
    assert.equal(response.body.data.summary.standing.display, 'percent');
    assert.equal(response.body.data.summary.standing.userCompletionRate, 14);
    assert.equal(response.body.data.summary.standing.aheadPercent, 0);
    assert.equal(response.body.data.byCategory.length, 2);
    assert.equal(response.body.data.trendingHabits.length, 2);
    assert.equal(response.body.data.trendingHabits[0].canonicalHabitKey, 'run');
    assert.equal(response.body.data.trendingHabits[0].checkIns, 2);
    assert.equal(response.body.data.trendingHabits[0].uniqueUsers, 1);
    assert.equal(response.body.data.comparisonPeriod.key, 'previous_7d');
    assert.equal(response.body.data.byCategory[0].trend.direction, 'up');
    assert.equal(response.body.data.summary.pulse.checkIns, 3);
    assert.equal(response.body.data.summary.pulse.activeUsers.count, 2);
    assert.equal(response.body.data.summary.pulse.checkInsTrend.display, 'new');

    const todayResponse = await request(app)
        .get('/api/trends/analytics?period=24h')
        .set('Authorization', token)
        .expect(200);

    assert.equal(todayResponse.body.data.period.key, '24h');
    assert.equal(todayResponse.body.data.comparisonPeriod.key, 'previous_24h');
});

test('GET /api/trends/analytics requires premium access', async () => {
    const user = await buildUser({ isPremium: false });

    const response = await request(app)
        .get('/api/trends/analytics?period=7d')
        .set('Authorization', authHeader(user))
        .expect(403);

    assert.equal(response.body.code, 'PREMIUM_REQUIRED');
});

test('GET /api/trends/analytics excludes deleted users from standing pool', async () => {
    const activeUser = await buildUser({ username: 'active_user', email: 'active@example.com' });
    const deletedUser = await buildUser({
        username: 'deleted_user',
        email: 'deleted@example.com',
        isDeleted: true,
    });
    const token = authHeader(activeUser);
    const completedAt = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 6);
    periodStart.setHours(0, 0, 0, 0);

    const habits = await Promise.all([
        Habit.create({
            title: 'Active habit',
            type: 'boolean',
            frequency: 'Daily',
            ownerId: activeUser._id,
            createdAt: periodStart,
            category: 'Movement',
            taxonomy: {
                categoryKey: 'movement',
                subcategoryKey: 'cardio',
                canonicalHabitKey: 'run',
                score: 0.9,
                assignedAt: completedAt,
            },
        }),
        Habit.create({
            title: 'Deleted user habit',
            type: 'boolean',
            frequency: 'Daily',
            ownerId: deletedUser._id,
            createdAt: periodStart,
            category: 'Learning',
            taxonomy: {
                categoryKey: 'learning',
                subcategoryKey: 'reading',
                canonicalHabitKey: 'read',
                score: 0.88,
                assignedAt: completedAt,
            },
        }),
    ]);

    await HabitCheckIn.create([
        {
            user: activeUser._id,
            habit: habits[0]._id,
            completedAt,
            periodKey: completedAt.toISOString().slice(0, 10),
        },
        {
            user: deletedUser._id,
            habit: habits[1]._id,
            completedAt,
            periodKey: completedAt.toISOString().slice(0, 10),
        },
    ]);

    const response = await request(app)
        .get('/api/trends/analytics?period=7d')
        .set('Authorization', token)
        .expect(200);

    assert.equal(response.body.data.summary.standing.display, 'percent');
    assert.equal(response.body.data.summary.standing.userCompletionRate, 14);
    assert.equal(response.body.data.summary.standing.aheadPercent, 0);
    assert.equal(response.body.data.trendingHabits.length, 1);
    assert.equal(response.body.data.summary.pulse.checkIns, 1);
    assert.equal(response.body.data.summary.pulse.activeUsers.count, 1);
});

test('GET /api/trends/analytics keeps check-ins after habit soft-delete', async () => {
    const user = await buildUser({ username: 'delete_habit_user', email: 'delete@example.com' });
    const token = authHeader(user);
    const completedAt = new Date();

    const runHabit = await Habit.create({
        title: 'Morning run',
        type: 'boolean',
        frequency: 'Daily',
        ownerId: user._id,
        category: 'Movement',
        taxonomy: {
            categoryKey: 'movement',
            subcategoryKey: 'cardio',
            canonicalHabitKey: 'run',
            score: 0.9,
            assignedAt: completedAt,
        },
    });

    await recordHabitCheckIn({ userId: user._id, habit: runHabit, completedAt });

    const beforeDelete = await request(app)
        .get('/api/trends/analytics?period=7d')
        .set('Authorization', token)
        .expect(200);

    assert.equal(beforeDelete.body.data.trendingHabits[0].canonicalHabitKey, 'run');

    await request(app)
        .delete(`/api/habits/${runHabit._id}`)
        .set('Authorization', token)
        .expect(204);

    const softDeleted = await Habit.findById(runHabit._id);
    assert.ok(softDeleted.deletedAt);

    const afterDelete = await request(app)
        .get('/api/trends/analytics?period=7d')
        .set('Authorization', token)
        .expect(200);

    assert.equal(afterDelete.body.data.trendingHabits[0].canonicalHabitKey, 'run');
    assert.equal(afterDelete.body.data.byCategory[0].categoryKey, 'movement');
});

test('GET /api/trends/analytics returns period-over-period category trends', async () => {
    const user = await buildUser({ username: 'trend_user', email: 'trend@example.com' });
    const token = authHeader(user);
    const completedAt = new Date();
    const previousWindowDate = new Date(completedAt);
    previousWindowDate.setDate(previousWindowDate.getDate() - 8);

    const runHabit = await Habit.create({
        title: 'Morning run',
        type: 'boolean',
        frequency: 'Daily',
        ownerId: user._id,
        category: 'Movement',
        taxonomy: {
            categoryKey: 'movement',
            subcategoryKey: 'cardio',
            canonicalHabitKey: 'run',
            score: 0.9,
            assignedAt: completedAt,
        },
    });

    await HabitCheckIn.create([
        {
            user: user._id,
            habit: runHabit._id,
            completedAt: previousWindowDate,
            periodKey: previousWindowDate.toISOString().slice(0, 10),
        },
        {
            user: user._id,
            habit: runHabit._id,
            completedAt,
            periodKey: completedAt.toISOString().slice(0, 10),
        },
        {
            user: user._id,
            habit: runHabit._id,
            completedAt: new Date(completedAt.getTime() - 60_000),
            periodKey: completedAt.toISOString().slice(0, 10),
        },
    ]);

    const response = await request(app)
        .get('/api/trends/analytics?period=7d')
        .set('Authorization', token)
        .expect(200);

    assert.equal(response.body.data.byCategory[0].categoryKey, 'movement');
    assert.equal(response.body.data.byCategory[0].trend.display, 'percent');
    assert.equal(response.body.data.byCategory[0].trend.changePercent, 100);
    assert.equal(response.body.data.trendingHabits[0].trend.display, 'percent');
    assert.equal(response.body.data.trendingHabits[0].trend.changePercent, 100);
    assert.equal(response.body.data.summary.pulse.checkInsTrend.display, 'percent');
    assert.equal(response.body.data.summary.pulse.checkInsTrend.changePercent, 100);
});

test('GET /api/trends/analytics excludes ghost-mode users from pulse aggregates', async () => {
    const visibleUser = await buildUser({ username: 'visible_user', email: 'visible@example.com' });
    const ghostUser = await buildUser({
        username: 'ghost_user',
        email: 'ghost@example.com',
        ghostMode: true,
    });
    const token = authHeader(visibleUser);
    const completedAt = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 6);
    periodStart.setHours(0, 0, 0, 0);

    const habits = await Promise.all([
        Habit.create({
            title: 'Visible habit',
            type: 'boolean',
            frequency: 'Daily',
            ownerId: visibleUser._id,
            createdAt: periodStart,
            category: 'Movement',
            taxonomy: {
                categoryKey: 'movement',
                subcategoryKey: 'cardio',
                canonicalHabitKey: 'run',
                score: 0.9,
                assignedAt: completedAt,
            },
        }),
        Habit.create({
            title: 'Ghost habit',
            type: 'boolean',
            frequency: 'Daily',
            ownerId: ghostUser._id,
            createdAt: periodStart,
            category: 'Learning',
            taxonomy: {
                categoryKey: 'learning',
                subcategoryKey: 'reading',
                canonicalHabitKey: 'read',
                score: 0.88,
                assignedAt: completedAt,
            },
        }),
    ]);

    await HabitCheckIn.create([
        {
            user: visibleUser._id,
            habit: habits[0]._id,
            completedAt,
            periodKey: completedAt.toISOString().slice(0, 10),
        },
        {
            user: ghostUser._id,
            habit: habits[1]._id,
            completedAt,
            periodKey: completedAt.toISOString().slice(0, 10),
        },
    ]);

    const response = await request(app)
        .get('/api/trends/analytics?period=7d')
        .set('Authorization', token)
        .expect(200);

    assert.equal(response.body.data.summary.pulse.checkIns, 1);
    assert.equal(response.body.data.summary.pulse.activeUsers.count, 1);
    assert.equal(response.body.data.trendingHabits.length, 1);
    assert.equal(response.body.data.trendingHabits[0].canonicalHabitKey, 'run');
});

test('GET /api/trends/analytics counts distinct active users in pulse', async () => {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 6);
    periodStart.setHours(0, 0, 0, 0);
    const completedAt = new Date();

    const users = [];
    for (let index = 0; index < 10; index += 1) {
        users.push(await buildUser({
            username: `pulse_user_${index}`,
            email: `pulse_${index}@example.com`,
        }));
    }

    for (const user of users) {
        const habit = await createDailyHabit(user._id, `Habit ${user.username}`, periodStart);
        await HabitCheckIn.create({
            user: user._id,
            habit: habit._id,
            completedAt,
            periodKey: completedAt.toISOString().slice(0, 10),
        });
    }

    const response = await request(app)
        .get('/api/trends/analytics?period=7d')
        .set('Authorization', authHeader(users[0]))
        .expect(200);

    assert.equal(response.body.data.summary.pulse.checkIns, 10);
    assert.equal(response.body.data.summary.pulse.activeUsers.count, 10);
    assert.equal(response.body.data.summary.pulse.activeUsers.trend.display, 'new');
});

test('GET /api/trends/analytics returns completion standing percentile', async () => {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 6);
    periodStart.setHours(0, 0, 0, 0);

    const users = [];
    for (let index = 0; index < 10; index += 1) {
        users.push(await buildUser({
            username: `standing_user_${index}`,
            email: `standing_${index}@example.com`,
        }));
    }

    for (let index = 0; index < users.length; index += 1) {
        const habit = await createDailyHabit(users[index]._id, `Habit ${index}`, periodStart);
        const completedDays = index === 0 ? 7 : index <= 4 ? 6 : 0;
        await seedDailyCheckIns(users[index]._id, habit._id, completedDays);
    }

    const response = await request(app)
        .get('/api/trends/analytics?period=7d')
        .set('Authorization', authHeader(users[0]))
        .expect(200);

    assert.equal(response.body.data.summary.standing.display, 'percent');
    assert.equal(response.body.data.summary.standing.eligible, true);
    assert.equal(response.body.data.summary.standing.userCompletionRate, 100);
    assert.equal(response.body.data.summary.standing.aheadPercent, 90);
});

test('GET /api/trends/analytics excludes mid-period habits from standing', async () => {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 6);
    periodStart.setHours(0, 0, 0, 0);

    const users = [];
    for (let index = 0; index < 10; index += 1) {
        users.push(await buildUser({
            username: `midperiod_user_${index}`,
            email: `midperiod_${index}@example.com`,
        }));
    }

    for (let index = 0; index < users.length; index += 1) {
        const habit = await createDailyHabit(users[index]._id, `Habit ${index}`, periodStart);
        await seedDailyCheckIns(users[index]._id, habit._id, 7);
    }

    const viewer = users[0];
    const midPeriodHabit = await createDailyHabit(viewer._id, 'Late habit', new Date());
    await seedDailyCheckIns(viewer._id, midPeriodHabit._id, 1);

    const response = await request(app)
        .get('/api/trends/analytics?period=7d')
        .set('Authorization', authHeader(viewer))
        .expect(200);

    assert.equal(response.body.data.summary.standing.display, 'percent');
    assert.equal(response.body.data.summary.standing.userCompletionRate, 100);
});

test('GET /api/trends/analytics keeps soft-deleted habits in standing denominator', async () => {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 6);
    periodStart.setHours(0, 0, 0, 0);

    const users = [];
    for (let index = 0; index < 10; index += 1) {
        users.push(await buildUser({
            username: `softdelete_user_${index}`,
            email: `softdelete_${index}@example.com`,
        }));
    }

    for (let index = 0; index < users.length; index += 1) {
        const firstHabit = await createDailyHabit(users[index]._id, `Primary ${index}`, periodStart);
        await seedDailyCheckIns(users[index]._id, firstHabit._id, index === 0 ? 7 : 6);

        if (index === 0) {
            const secondHabit = await createDailyHabit(users[index]._id, `Secondary ${index}`, periodStart);
            await seedDailyCheckIns(users[index]._id, secondHabit._id, 0);
            await Habit.findByIdAndUpdate(secondHabit._id, { deletedAt: new Date() });
        }
    }

    const response = await request(app)
        .get('/api/trends/analytics?period=7d')
        .set('Authorization', authHeader(users[0]))
        .expect(200);

    assert.equal(response.body.data.summary.standing.display, 'percent');
    assert.ok(response.body.data.summary.standing.userCompletionRate < 100);
});

test('GET /api/trends/analytics excludes challenge habits from standing', async () => {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 6);
    periodStart.setHours(0, 0, 0, 0);

    const users = [];
    for (let index = 0; index < 10; index += 1) {
        users.push(await buildUser({
            username: `challenge_user_${index}`,
            email: `challenge_${index}@example.com`,
        }));
    }

    for (let index = 0; index < users.length; index += 1) {
        const habit = await createDailyHabit(users[index]._id, `Habit ${index}`, periodStart);
        await seedDailyCheckIns(users[index]._id, habit._id, 7);
    }

    await Habit.create({
        title: 'Challenge habit',
        type: 'boolean',
        frequency: 'Daily',
        ownerId: users[0]._id,
        source: 'challenge',
        createdAt: periodStart,
    });

    const response = await request(app)
        .get('/api/trends/analytics?period=7d')
        .set('Authorization', authHeader(users[0]))
        .expect(200);

    assert.equal(response.body.data.summary.standing.display, 'percent');
    assert.equal(response.body.data.summary.standing.userCompletionRate, 100);
});

test('GET /api/trends/analytics returns subcategory breakdown nested under categories', async () => {
    const user = await buildUser({ username: 'subcategory_user', email: 'subcategory@example.com' });
    const token = authHeader(user);
    const completedAt = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 6);
    periodStart.setHours(0, 0, 0, 0);

    const [cardioHabit, strengthHabit, readHabit, unclassifiedMovementHabit] = await Promise.all([
        Habit.create({
            title: 'Morning run',
            type: 'boolean',
            frequency: 'Daily',
            ownerId: user._id,
            createdAt: periodStart,
            category: 'Movement',
            taxonomy: {
                categoryKey: 'movement',
                subcategoryKey: 'cardio',
                canonicalHabitKey: 'run',
                score: 0.9,
                assignedAt: completedAt,
            },
        }),
        Habit.create({
            title: 'Lift weights',
            type: 'boolean',
            frequency: 'Daily',
            ownerId: user._id,
            createdAt: periodStart,
            category: 'Movement',
            taxonomy: {
                categoryKey: 'movement',
                subcategoryKey: 'strength',
                canonicalHabitKey: 'strength-training',
                score: 0.9,
                assignedAt: completedAt,
            },
        }),
        Habit.create({
            title: 'Read book',
            type: 'boolean',
            frequency: 'Daily',
            ownerId: user._id,
            createdAt: periodStart,
            category: 'Learning',
            taxonomy: {
                categoryKey: 'learning',
                subcategoryKey: 'reading',
                canonicalHabitKey: 'read',
                score: 0.88,
                assignedAt: completedAt,
            },
        }),
        Habit.create({
            title: 'Stretch',
            type: 'boolean',
            frequency: 'Daily',
            ownerId: user._id,
            createdAt: periodStart,
            category: 'Movement',
            taxonomy: {
                categoryKey: 'movement',
                subcategoryKey: null,
                canonicalHabitKey: null,
                score: null,
                assignedAt: null,
            },
        }),
    ]);

    await HabitCheckIn.create([
        {
            user: user._id,
            habit: cardioHabit._id,
            completedAt,
            periodKey: periodKeyForDate(completedAt),
        },
        {
            user: user._id,
            habit: cardioHabit._id,
            completedAt: new Date(completedAt.getTime() - DAY_IN_MS),
            periodKey: periodKeyForDate(new Date(completedAt.getTime() - DAY_IN_MS)),
        },
        {
            user: user._id,
            habit: cardioHabit._id,
            completedAt: new Date(completedAt.getTime() - 2 * DAY_IN_MS),
            periodKey: periodKeyForDate(new Date(completedAt.getTime() - 2 * DAY_IN_MS)),
        },
        {
            user: user._id,
            habit: strengthHabit._id,
            completedAt,
            periodKey: periodKeyForDate(completedAt),
        },
        {
            user: user._id,
            habit: readHabit._id,
            completedAt,
            periodKey: periodKeyForDate(completedAt),
        },
        {
            user: user._id,
            habit: unclassifiedMovementHabit._id,
            completedAt,
            periodKey: periodKeyForDate(completedAt),
        },
    ]);

    const response = await request(app)
        .get('/api/trends/analytics?period=7d')
        .set('Authorization', token)
        .expect(200);

    const movementCategory = response.body.data.byCategory.find((item) => item.categoryKey === 'movement');
    const learningCategory = response.body.data.byCategory.find((item) => item.categoryKey === 'learning');

    assert.ok(movementCategory);
    assert.equal(movementCategory.checkIns, 5);
    assert.equal(movementCategory.bySubcategory.length, 2);
    assert.equal(movementCategory.bySubcategory[0].subcategoryKey, 'cardio');
    assert.equal(movementCategory.bySubcategory[0].subcategoryLabel, 'Cardio');
    assert.equal(movementCategory.bySubcategory[0].checkIns, 3);
    assert.equal(movementCategory.bySubcategory[1].subcategoryKey, 'strength');
    assert.equal(movementCategory.bySubcategory[1].subcategoryLabel, 'Strength');
    assert.equal(movementCategory.bySubcategory[1].checkIns, 1);

    const subcategoryShareTotal = movementCategory.bySubcategory.reduce((sum, item) => sum + item.share, 0);
    assert.ok(subcategoryShareTotal <= movementCategory.share);

    assert.ok(learningCategory);
    assert.equal(learningCategory.bySubcategory.length, 1);
    assert.equal(learningCategory.bySubcategory[0].subcategoryKey, 'reading');
    assert.equal(learningCategory.bySubcategory[0].subcategoryLabel, 'Reading');
});
