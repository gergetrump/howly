import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import connectDB from '../src/config/database.js';
import Habit from '../src/features/habits/habit.model.js';
import User from '../src/features/users/user.model.js';
import { isCompletedForPeriod, isPreviousPeriod } from '../src/features/habits/habit.service.js';
import {
  runDailyStreakMaintenance,
  applyFreezeToHabit,
  applyFreezeToOverall,
  STREAK_FREEZE_ERROR_CODES,
} from '../src/features/streakFreeze/streakFreeze.service.js';

let mongo;

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function buildUser(overrides = {}) {
  const suffix = Math.random().toString(36).slice(2, 10);
  return User.create({
    username: overrides.username || `user_${suffix}`,
    email: overrides.email || `user_${suffix}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    passwordHash: 'hashed',
    authProvider: 'local',
    ...overrides,
  });
}

async function buildHabit(ownerId, overrides = {}) {
  return Habit.create({
    ownerId,
    title: 'Test habit',
    type: 'boolean',
    frequency: 'Daily',
    category: 'Movement',
    ...overrides,
  });
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
});

afterEach(async () => {
  await Promise.all([
    Habit.deleteMany({}),
    User.deleteMany({}),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

test('runDailyStreakMaintenance opens a grace deadline for an at-risk habit without breaking it', async () => {
  const user = await buildUser();
  const habit = await buildHabit(user._id, { streakCount: 5, lastCompletedAt: daysAgo(3) });

  const result = await runDailyStreakMaintenance(new Date());

  assert.equal(result.habitsOpened, 1);
  assert.equal(result.habitsBroken, 0);

  const reloaded = await Habit.findById(habit._id);
  assert.ok(reloaded.streakRepairDeadline, 'deadline should be set');
  assert.equal(reloaded.streakCount, 5);
});

test('runDailyStreakMaintenance breaks the habit streak once the grace deadline has passed', async () => {
  const user = await buildUser();
  const habit = await buildHabit(user._id, {
    streakCount: 5,
    lastCompletedAt: daysAgo(3),
    streakRepairDeadline: daysAgo(1),
  });

  const result = await runDailyStreakMaintenance(new Date());

  assert.equal(result.habitsBroken, 1);

  const reloaded = await Habit.findById(habit._id);
  assert.equal(reloaded.streakCount, 0);
  assert.equal(reloaded.streakRepairDeadline, null);
});

test('runDailyStreakMaintenance leaves a habit completed for the current period untouched', async () => {
  const user = await buildUser();
  const habit = await buildHabit(user._id, { streakCount: 5, lastCompletedAt: new Date() });

  const result = await runDailyStreakMaintenance(new Date());

  assert.equal(result.habitsOpened, 0);
  assert.equal(result.habitsBroken, 0);

  const reloaded = await Habit.findById(habit._id);
  assert.equal(reloaded.streakCount, 5);
  assert.equal(reloaded.streakRepairDeadline, null);
});

test('runDailyStreakMaintenance clears a stale deadline when the habit is no longer at risk', async () => {
  const user = await buildUser();
  const habit = await buildHabit(user._id, {
    streakCount: 5,
    lastCompletedAt: new Date(),
    streakRepairDeadline: daysAgo(-2),
  });

  await runDailyStreakMaintenance(new Date());

  const reloaded = await Habit.findById(habit._id);
  assert.equal(reloaded.streakRepairDeadline, null);
  assert.equal(reloaded.streakCount, 5);
});

test('runDailyStreakMaintenance opens a grace deadline for a missed overall streak', async () => {
  const now = new Date();
  const user = await buildUser({ streak: 7, streakLastDay: daysAgo(2) });

  const result = await runDailyStreakMaintenance(now);

  assert.equal(result.overallOpened, 1);
  assert.equal(result.overallBroken, 0);

  const reloaded = await User.findById(user._id);
  assert.ok(reloaded.streakRepairDeadline, 'overall deadline should be set');
  assert.equal(reloaded.streak, 7);
});

test('runDailyStreakMaintenance auto-uses a shield to save a missed overall streak', async () => {
  const now = new Date();
  const user = await buildUser({
    streak: 7,
    streakLastDay: daysAgo(2),
    streakShields: 2,
  });

  const result = await runDailyStreakMaintenance(now);

  assert.equal(result.overallAutoShielded, 1);
  assert.equal(result.overallOpened, 0);
  assert.equal(result.overallBroken, 0);

  const reloaded = await User.findById(user._id);
  assert.equal(reloaded.streak, 7);
  assert.equal(reloaded.streakShields, 1);
  assert.equal(reloaded.streakRepairDeadline, null);
});

test('runDailyStreakMaintenance breaks the overall streak after the grace deadline', async () => {
  const now = new Date();
  const user = await buildUser({
    streak: 7,
    streakLastDay: daysAgo(2),
    streakRepairDeadline: daysAgo(1),
  });

  const result = await runDailyStreakMaintenance(now);

  assert.equal(result.overallBroken, 1);

  const reloaded = await User.findById(user._id);
  assert.equal(reloaded.streak, 0);
  assert.equal(reloaded.streakRepairDeadline, null);
});

test('runDailyStreakMaintenance leaves an overall streak completed yesterday untouched', async () => {
  const now = new Date();
  const user = await buildUser({ streak: 7, streakLastDay: daysAgo(1) });

  const result = await runDailyStreakMaintenance(now);

  assert.equal(result.overallOpened, 0);
  assert.equal(result.overallBroken, 0);

  const reloaded = await User.findById(user._id);
  assert.equal(reloaded.streak, 7);
});

test('applyFreezeToHabit bridges the missed period but leaves today open to check off', async () => {
  const user = await buildUser({ streakShields: 2 });
  const habit = await buildHabit(user._id, { streakCount: 5, lastCompletedAt: daysAgo(3) });

  const result = await applyFreezeToHabit(user._id, habit._id, new Date());

  assert.equal(result.streakShields, 1);

  const reloadedHabit = await Habit.findById(habit._id);
  assert.equal(reloadedHabit.streakCount, 5);
  assert.equal(reloadedHabit.streakRepairDeadline, null);
  assert.equal(isCompletedForPeriod(reloadedHabit), false);
  assert.equal(isPreviousPeriod(reloadedHabit, reloadedHabit.lastCompletedAt), true);

  const reloadedUser = await User.findById(user._id);
  assert.equal(reloadedUser.streakShields, 1);
});

test('applyFreezeToHabit throws NO_SHIELDS when the user has none', async () => {
  const user = await buildUser({ streakShields: 0 });
  const habit = await buildHabit(user._id, { streakCount: 5, lastCompletedAt: daysAgo(3) });

  await assert.rejects(
    () => applyFreezeToHabit(user._id, habit._id, new Date()),
    (error) => error.code === STREAK_FREEZE_ERROR_CODES.NO_SHIELDS,
  );
});

test('applyFreezeToHabit throws NOT_AT_RISK for a habit that is not at risk', async () => {
  const user = await buildUser({ streakShields: 2 });
  const habit = await buildHabit(user._id, { streakCount: 5, lastCompletedAt: new Date() });

  await assert.rejects(
    () => applyFreezeToHabit(user._id, habit._id, new Date()),
    (error) => error.code === STREAK_FREEZE_ERROR_CODES.NOT_AT_RISK,
  );
});

test('applyFreezeToOverall spends a shield and rescues the overall streak', async () => {
  const now = new Date();
  const user = await buildUser({ streak: 7, streakLastDay: daysAgo(2), streakShields: 2 });

  const result = await applyFreezeToOverall(user._id, now);

  assert.equal(result.streakShields, 1);
  assert.equal(result.streak, 7);

  const reloaded = await User.findById(user._id);
  assert.equal(reloaded.streakShields, 1);
  assert.equal(reloaded.streak, 7);
  assert.equal(reloaded.streakRepairDeadline, null);

  const followUp = await runDailyStreakMaintenance(now);
  assert.equal(followUp.overallBroken, 0);
  assert.equal(followUp.overallOpened, 0);
});

test('one shield rescues the overall streak and all at-risk habits together', async () => {
  const now = new Date();
  const user = await buildUser({ streak: 7, streakLastDay: daysAgo(2), streakShields: 2 });
  const habitA = await buildHabit(user._id, { streakCount: 5, lastCompletedAt: daysAgo(3) });
  const habitB = await buildHabit(user._id, { streakCount: 4, lastCompletedAt: daysAgo(3) });

  const result = await applyFreezeToOverall(user._id, now);

  assert.equal(result.streakShields, 1);

  const reloadedA = await Habit.findById(habitA._id);
  const reloadedB = await Habit.findById(habitB._id);

  assert.equal(reloadedA.streakCount, 5);
  assert.equal(reloadedB.streakCount, 4);
  assert.equal(isCompletedForPeriod(reloadedA), false);
  assert.equal(isCompletedForPeriod(reloadedB), false);
  assert.equal(isPreviousPeriod(reloadedA, reloadedA.lastCompletedAt), true);
  assert.equal(isPreviousPeriod(reloadedB, reloadedB.lastCompletedAt), true);
});

test('applyFreezeToOverall throws NO_SHIELDS when the user has none', async () => {
  const user = await buildUser({ streak: 7, streakLastDay: daysAgo(2), streakShields: 0 });

  await assert.rejects(
    () => applyFreezeToOverall(user._id, new Date()),
    (error) => error.code === STREAK_FREEZE_ERROR_CODES.NO_SHIELDS,
  );
});

test('applyFreezeToOverall throws NOT_AT_RISK when the overall streak is not missed', async () => {
  const user = await buildUser({ streak: 7, streakLastDay: daysAgo(1), streakShields: 2 });

  await assert.rejects(
    () => applyFreezeToOverall(user._id, new Date()),
    (error) => error.code === STREAK_FREEZE_ERROR_CODES.NOT_AT_RISK,
  );
});
