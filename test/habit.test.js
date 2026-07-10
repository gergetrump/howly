import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import Habit from '../src/features/habits/habit.model.js';
import User from '../src/features/users/user.model.js';
import Item from '../src/features/items/item.model.js';
import UserItem from '../src/features/inventory/inventory.model.js';
import BoostPurchaseLimit from '../src/features/inventory/boostPurchaseLimit.model.js';
import HabitBoost from '../src/features/boosts/habitBoost.model.js';
import config from '../config.js';
import { getPlanForUser } from '../src/config/plans.js';
import { getBoostPurchaseMonthKey } from '../src/features/inventory/inventory.service.js';
import { applyFreezeToHabit } from '../src/features/streakFreeze/streakFreeze.service.js';

let mongo;
let app;

// Helper to create users for testing
async function buildUser(overrides = {}) {
  const suffix = Math.random().toString(36).slice(2, 10);
  return User.create({
    username: overrides.username || `user_${suffix}`,
    email: overrides.email || `user_${suffix}@example.com`,
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    passwordHash: overrides.passwordHash || 'hashed',
    authProvider: overrides.authProvider || 'local',
    ...overrides,
  });
}

function authHeader(user) {
  return `Bearer ${signAccessToken(user)}`;
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
    User.deleteMany({}),
    Item.deleteMany({}),
    UserItem.deleteMany({}),
    BoostPurchaseLimit.deleteMany({}),
    HabitBoost.deleteMany({}),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

test('habits CRUD operations work correctly', async () => {
  const user = await buildUser();
  const token = authHeader(user);

  // 1. Create a habit
  const createResponse = await request(app)
    .post('/api/habits')
    .set('Authorization', token)
    .send({
      title: 'Morning Run',
      type: 'boolean',
      frequency: 'Daily',
      category: 'Movement',
      icon: '🏃'
    })
    .expect(201);

  const habitId = createResponse.body.data.id;
  assert.equal(createResponse.body.data.title, 'Morning Run');
  assert.equal(createResponse.body.data.frequency, 'Daily');

  // 2. Fetch habits
  const listResponse = await request(app)
    .get('/api/habits')
    .set('Authorization', token)
    .expect(200);

  assert.equal(listResponse.body.data.length, 1);
  assert.equal(listResponse.body.data[0].id, habitId);

  // 3. Update a habit
  const updateResponse = await request(app)
    .patch(`/api/habits/${habitId}`)
    .set('Authorization', token)
    .send({
      title: 'Evening Run',
      frequency: 'Weekly'
    })
    .expect(200);

  assert.equal(updateResponse.body.data.title, 'Evening Run');
  assert.equal(updateResponse.body.data.frequency, 'Weekly');

  // 4. Delete the habit
  await request(app)
    .delete(`/api/habits/${habitId}`)
    .set('Authorization', token)
    .expect(204);

  // 5. Verify soft deletion hides the habit from the list but keeps it in the database
  const listAfterDelete = await request(app)
    .get('/api/habits')
    .set('Authorization', token)
    .expect(200);

  assert.equal(listAfterDelete.body.data.length, 0);

  const deletedHabit = await Habit.findById(habitId);
  assert.ok(deletedHabit);
  assert.ok(deletedHabit.deletedAt);
});

test('habit check-in and uncheck-in updates streaks correctly', async () => {
  const user = await buildUser();
  const token = authHeader(user);

  // Create a daily habit
  const createResponse = await request(app)
    .post('/api/habits')
    .set('Authorization', token)
    .send({
      title: 'Drink Water',
      type: 'numeric',
      target: 2,
      unit: 'L',
      frequency: 'Daily',
      category: 'Nutrition'
    })
    .expect(201);

  const habitId = createResponse.body.data.id;
  assert.equal(createResponse.body.data.streakCount, 0);
  assert.equal(createResponse.body.data.isCompletedToday, false);

  // 1. Check-in the habit for today
  const checkInResponse = await request(app)
    .post(`/api/habits/${habitId}/check-ins`)
    .set('Authorization', token)
    .expect(200);

  assert.equal(checkInResponse.body.data.streakCount, 1);
  assert.equal(checkInResponse.body.data.isCompletedToday, true);

  // 2. Try to check-in again (should fail)
  await request(app)
    .post(`/api/habits/${habitId}/check-ins`)
    .set('Authorization', token)
    .expect(400);

  // 3. Uncheck-in the habit
  const uncheckInResponse = await request(app)
    .delete(`/api/habits/${habitId}/check-ins`)
    .set('Authorization', token)
    .expect(200);

  assert.equal(uncheckInResponse.body.data.streakCount, 0);
  assert.equal(uncheckInResponse.body.data.isCompletedToday, false);

  // 4. Try to uncheck-in again (should fail)
  await request(app)
    .delete(`/api/habits/${habitId}/check-ins`)
    .set('Authorization', token)
    .expect(400);
});

test('uncompleting a monthly habit leaves it re-completable and does not drain the streak', async () => {
  const user = await buildUser();
  const token = authHeader(user);
  const now = new Date();

  const habit = await Habit.create({
    ownerId: user._id,
    title: 'Monthly review',
    type: 'boolean',
    frequency: 'Monthly',
    streakCount: 5,
    lastCompletedAt: new Date(now.getFullYear(), now.getMonth() - 1, 15),
  });

  const completed = await request(app)
    .post(`/api/habits/${habit._id}/check-ins`)
    .set('Authorization', token)
    .expect(200);
  assert.equal(completed.body.data.streakCount, 6);

  const uncompleted = await request(app)
    .delete(`/api/habits/${habit._id}/check-ins`)
    .set('Authorization', token)
    .expect(200);
  assert.equal(uncompleted.body.data.streakCount, 5);
  assert.equal(uncompleted.body.data.isCompletedToday, false);

  await request(app)
    .delete(`/api/habits/${habit._id}/check-ins`)
    .set('Authorization', token)
    .expect(400);

  const recompleted = await request(app)
    .post(`/api/habits/${habit._id}/check-ins`)
    .set('Authorization', token)
    .expect(200);
  assert.equal(recompleted.body.data.streakCount, 6);
});

test('habit create and update ignore client-supplied internal fields', async () => {
  const user = await buildUser();
  const token = authHeader(user);
  const savedKey = config.moderation.apiKey;
  config.moderation.apiKey = '';

  try {
    const created = await request(app)
      .post('/api/habits')
      .set('Authorization', token)
      .send({
        title: 'Gym',
        type: 'boolean',
        frequency: 'Daily',
        streakCount: 9999,
        source: 'challenge',
        lastCompletedAt: new Date().toISOString(),
        deletedAt: new Date().toISOString(),
      })
      .expect(201);

    assert.equal(created.body.data.streakCount, 0);
    assert.equal(created.body.data.source, 'manual');

    const stored = await Habit.findById(created.body.data.id);
    assert.equal(stored.streakCount, 0);
    assert.equal(stored.source, 'manual');
    assert.equal(stored.deletedAt, null);
    assert.equal(stored.lastCompletedAt, null);

    const patched = await request(app)
      .patch(`/api/habits/${created.body.data.id}`)
      .set('Authorization', token)
      .send({ title: 'Gym updated', streakCount: 5555, source: 'challenge' })
      .expect(200);

    assert.equal(patched.body.data.title, 'Gym updated');
    assert.equal(patched.body.data.streakCount, 0);
    assert.equal(patched.body.data.source, 'manual');
  } finally {
    config.moderation.apiKey = savedKey;
  }
});

test('bulk template creation is moderated', async () => {
  const user = await buildUser();
  const token = authHeader(user);
  const savedKey = config.moderation.apiKey;
  const savedFetch = global.fetch;
  const savedConsoleError = console.error;
  config.moderation.apiKey = 'sk-test';
  console.error = () => {};
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ results: [{ flagged: true, category_scores: {} }] }),
    text: async () => '',
  });

  try {
    const res = await request(app)
      .post('/api/habits/templates')
      .set('Authorization', token)
      .send({ templates: [{ title: 'a harmful title', frequency: 'Daily' }] })
      .expect(400);

    assert.equal(res.body.errorCode, 'HABIT_MODERATION_BLOCKED');
    assert.equal(await Habit.countDocuments({ ownerId: user._id }), 0);
  } finally {
    config.moderation.apiKey = savedKey;
    global.fetch = savedFetch;
    console.error = savedConsoleError;
  }
});

test('habit title update is moderated', async () => {
  const user = await buildUser();
  const token = authHeader(user);
  const savedKey = config.moderation.apiKey;
  const savedFetch = global.fetch;
  const savedConsoleError = console.error;
  config.moderation.apiKey = 'sk-test';
  console.error = () => {};

  const moderationResult = { flagged: false };
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ results: [{ flagged: moderationResult.flagged, category_scores: {} }] }),
    text: async () => '',
  });

  try {
    const created = await request(app)
      .post('/api/habits')
      .set('Authorization', token)
      .send({ title: 'Gym', type: 'boolean', frequency: 'Daily' })
      .expect(201);

    moderationResult.flagged = true;
    await request(app)
      .patch(`/api/habits/${created.body.data.id}`)
      .set('Authorization', token)
      .send({ title: 'a harmful title' })
      .expect(400);

    const stored = await Habit.findById(created.body.data.id);
    assert.equal(stored.title, 'Gym');
  } finally {
    config.moderation.apiKey = savedKey;
    global.fetch = savedFetch;
    console.error = savedConsoleError;
  }
});

test('bulk template creation rejects a non-array or empty body', async () => {
  const user = await buildUser();
  const token = authHeader(user);

  await request(app)
    .post('/api/habits/templates')
    .set('Authorization', token)
    .send({ templates: 'not an array' })
    .expect(400);

  await request(app)
    .post('/api/habits/templates')
    .set('Authorization', token)
    .send({})
    .expect(400);
});

test('changing a habit to due-today revokes a now-broken perfect-day streak', async () => {
  const user = await buildUser({ streak: 5, streakLastDay: new Date() });
  const token = authHeader(user);
  const savedKey = config.moderation.apiKey;
  config.moderation.apiKey = '';

  try {
    await Habit.create({
      ownerId: user._id, title: 'Gym', type: 'boolean', frequency: 'Daily',
      streakCount: 1, lastCompletedAt: new Date(),
    });
    const todayDow = new Date().getDay() || 7;
    const otherDay = todayDow === 1 ? 2 : 1;
    const restHabit = await Habit.create({
      ownerId: user._id, title: 'Weekend', type: 'boolean', frequency: 'Custom',
      customDays: [otherDay], streakCount: 0, lastCompletedAt: null,
    });

    await request(app)
      .patch(`/api/habits/${restHabit._id}`)
      .set('Authorization', token)
      .send({ frequency: 'Daily' })
      .expect(200);

    const reloaded = await User.findById(user._id).select('streak');
    assert.equal(reloaded.streak, 4);
  } finally {
    config.moderation.apiKey = savedKey;
  }
});

test('overall streak revoke ignores soft-deleted habits', async () => {
  const user = await buildUser({ streak: 5, streakLastDay: new Date() });
  const token = authHeader(user);
  const savedKey = config.moderation.apiKey;
  config.moderation.apiKey = '';

  try {
    await Habit.create({
      ownerId: user._id,
      title: 'Gym',
      type: 'boolean',
      frequency: 'Daily',
      streakCount: 1,
      lastCompletedAt: new Date(),
    });

    await Habit.create({
      ownerId: user._id,
      title: 'Deleted habit',
      type: 'boolean',
      frequency: 'Daily',
      streakCount: 0,
      lastCompletedAt: null,
      deletedAt: new Date(),
    });

    const todayDow = new Date().getDay() || 7;
    const otherDay = todayDow === 1 ? 2 : 1;
    await request(app)
      .post('/api/habits')
      .set('Authorization', token)
      .send({ title: 'Alternate day walk', type: 'boolean', frequency: 'Custom', customDays: [otherDay] })
      .expect(201);

    const refreshed = await User.findById(user._id).select('streak');
    assert.equal(refreshed.streak, 5);
  } finally {
    config.moderation.apiKey = savedKey;
  }
});

test('completing all due habits clears the overall streak repair deadline', async () => {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const inOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const user = await buildUser({
    streak: 7,
    streakLastDay: twoDaysAgo,
    streakRepairDeadline: inOneDay,
  });
  const token = authHeader(user);

  const createResponse = await request(app)
    .post('/api/habits')
    .set('Authorization', token)
    .send({
      title: 'Read',
      type: 'boolean',
      frequency: 'Daily',
      category: 'Movement',
    })
    .expect(201);

  await request(app)
    .post(`/api/habits/${createResponse.body.data.id}/check-ins`)
    .set('Authorization', token)
    .expect(200);

  const reloaded = await User.findById(user._id).select('streakRepairDeadline streakLastDay');
  assert.equal(reloaded.streakRepairDeadline, null);
  assert.ok(reloaded.streakLastDay);
});

test('a rescued at-risk habit can still be checked off today and advances the streak', async () => {
  const user = await buildUser({ streakShields: 1 });
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const habit = await Habit.create({
    title: 'Read',
    type: 'boolean',
    frequency: 'Daily',
    ownerId: user._id,
    streakCount: 5,
    lastCompletedAt: twoDaysAgo,
  });

  await applyFreezeToHabit(user._id, habit._id, new Date());

  const rescued = await Habit.findById(habit._id);
  assert.equal(rescued.streakCount, 5);

  const checkIn = await request(app)
    .post(`/api/habits/${habit._id}/check-ins`)
    .set('Authorization', authHeader(user))
    .expect(200);

  assert.equal(checkIn.body.data.isCompletedToday, true);
  assert.equal(checkIn.body.data.streakCount, 6);
});

test('habit boost can be bought, used from inventory, and grants bonus coins for the next completions', async () => {
  const user = await buildUser({ coins: 500 });
  const token = authHeader(user);
  const boostItem = await Item.create({
    name: 'Small Boost',
    type: 'powerUp',
    price: 100,
    assetKey: 'small-boost',
  });

  const createResponse = await request(app)
    .post('/api/habits')
    .set('Authorization', token)
    .send({
      title: 'Read',
      type: 'boolean',
      frequency: 'Daily',
      category: 'Productivity',
    })
    .expect(201);

  const habitId = createResponse.body.data.id;

  const buyResponse = await request(app)
    .post('/api/inventory/buy')
    .set('Authorization', token)
    .send({
      itemId: boostItem._id.toString(),
    })
    .expect(201);

  assert.equal(buyResponse.body.item.assetKey, 'small-boost');
  assert.equal(buyResponse.body.quantity, 1);

  const secondBuyResponse = await request(app)
    .post('/api/inventory/buy')
    .set('Authorization', token)
    .send({
      itemId: boostItem._id.toString(),
    })
    .expect(201);

  assert.equal(secondBuyResponse.body._id, buyResponse.body._id);
  assert.equal(secondBuyResponse.body.quantity, 2);

  const userAfterPurchase = await User.findById(user._id).lean();
  assert.equal(userAfterPurchase.coins, 300);

  const useBoostResponse = await request(app)
    .post(`/api/inventory/${buyResponse.body._id}/use`)
    .set('Authorization', token)
    .send({ habitId })
    .expect(200);

  assert.equal(useBoostResponse.body.assetKey, 'small-boost');
  assert.equal(useBoostResponse.body.boost.bonusCoins, 50);
  assert.equal(useBoostResponse.body.boost.remainingCompletions, 3);
  assert.equal(useBoostResponse.body.quantity, 1);
  assert.equal(await UserItem.countDocuments({ user: user._id }), 1);

  const checkInResponse = await request(app)
    .post(`/api/habits/${habitId}/check-ins`)
    .set('Authorization', token)
    .expect(200);

  assert.deepEqual(checkInResponse.body.boostReward, {
    assetKey: 'small-boost',
    bonusCoins: 50,
    remainingCompletions: 2,
    coins: 350,
  });

  const storedBoost = await HabitBoost.findOne({ user: user._id, habit: habitId }).lean();
  const updatedUser = await User.findById(user._id).lean();

  assert.equal(storedBoost.remainingCompletions, 2);
  assert.equal(storedBoost.rewardedPeriodKeys.length, 1);
  assert.equal(updatedUser.coins, 350);
});

test('habit boost ownership is capped at 20 per boost type', async () => {
  const user = await buildUser({ coins: 3000 });
  const token = authHeader(user);
  const boostItem = await Item.create({
    name: 'Small Boost',
    type: 'powerUp',
    price: 100,
    assetKey: 'small-boost',
  });

  for (let index = 0; index < 20; index += 1) {
    await request(app)
      .post('/api/inventory/buy')
      .set('Authorization', token)
      .send({
        itemId: boostItem._id.toString(),
      })
      .expect(201);
  }

  const ownedBoost = await UserItem.findOne({ user: user._id, item: boostItem._id }).lean();
  const userBeforeRejectedBuy = await User.findById(user._id).lean();

  assert.equal(ownedBoost.quantity, 20);
  assert.equal(userBeforeRejectedBuy.coins, 1000);

  const rejectedResponse = await request(app)
    .post('/api/inventory/buy')
    .set('Authorization', token)
    .send({
      itemId: boostItem._id.toString(),
    })
    .expect(400);

  const userAfterRejectedBuy = await User.findById(user._id).lean();

  assert.equal(rejectedResponse.body.code, 'BOOST_QUANTITY_LIMIT_REACHED');
  assert.equal(userAfterRejectedBuy.coins, 1000);

  const monthlyCounter = await BoostPurchaseLimit.findOne({
    user: user._id,
    assetKey: boostItem.assetKey,
    monthKey: getBoostPurchaseMonthKey(),
  }).lean();

  assert.equal(monthlyCounter.quantity, 20);
});

test('habit boost purchases are capped at 20 per boost type each month even after inventory is used', async () => {
  const user = await buildUser({ coins: 3000 });
  const token = authHeader(user);
  const boostItem = await Item.create({
    name: 'Small Boost',
    type: 'powerUp',
    price: 100,
    assetKey: 'small-boost',
  });

  for (let index = 0; index < 20; index += 1) {
    await request(app)
      .post('/api/inventory/buy')
      .set('Authorization', token)
      .send({
        itemId: boostItem._id.toString(),
      })
      .expect(201);

    await UserItem.deleteMany({ user: user._id, item: boostItem._id });
  }

  assert.equal(await UserItem.countDocuments({ user: user._id, item: boostItem._id }), 0);

  const userBeforeRejectedBuy = await User.findById(user._id).lean();
  const monthlyCounterBeforeRejectedBuy = await BoostPurchaseLimit.findOne({
    user: user._id,
    assetKey: boostItem.assetKey,
    monthKey: getBoostPurchaseMonthKey(),
  }).lean();

  assert.equal(userBeforeRejectedBuy.coins, 1000);
  assert.equal(monthlyCounterBeforeRejectedBuy.quantity, 20);

  const rejectedResponse = await request(app)
    .post('/api/inventory/buy')
    .set('Authorization', token)
    .send({
      itemId: boostItem._id.toString(),
    })
    .expect(400);

  const userAfterRejectedBuy = await User.findById(user._id).lean();

  assert.equal(rejectedResponse.body.code, 'BOOST_MONTHLY_LIMIT_REACHED');
  assert.equal(userAfterRejectedBuy.coins, 1000);
  assert.equal(await UserItem.countDocuments({ user: user._id, item: boostItem._id }), 0);
});

test('habit boost monthly purchase limits are scoped to the current month', async () => {
  const user = await buildUser({ coins: 500 });
  const token = authHeader(user);
  const boostItem = await Item.create({
    name: 'Small Boost',
    type: 'powerUp',
    price: 100,
    assetKey: 'small-boost',
  });
  const previousMonth = new Date();
  previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1);

  await BoostPurchaseLimit.create({
    user: user._id,
    assetKey: boostItem.assetKey,
    monthKey: getBoostPurchaseMonthKey(previousMonth),
    quantity: 20,
  });

  const response = await request(app)
    .post('/api/inventory/buy')
    .set('Authorization', token)
    .send({
      itemId: boostItem._id.toString(),
    })
    .expect(201);

  const currentMonthCounter = await BoostPurchaseLimit.findOne({
    user: user._id,
    assetKey: boostItem.assetKey,
    monthKey: getBoostPurchaseMonthKey(),
  }).lean();

  assert.equal(response.body.quantity, 1);
  assert.equal(currentMonthCounter.quantity, 1);
});

test('boost purchase limits endpoint returns current month usage', async () => {
  const user = await buildUser({ coins: 500 });
  const token = authHeader(user);
  const boostItem = await Item.create({
    name: 'Small Boost',
    type: 'powerUp',
    price: 100,
    assetKey: 'small-boost',
  });

  await request(app)
    .post('/api/inventory/buy')
    .set('Authorization', token)
    .send({
      itemId: boostItem._id.toString(),
    })
    .expect(201);

  await request(app)
    .post('/api/inventory/buy')
    .set('Authorization', token)
    .send({
      itemId: boostItem._id.toString(),
    })
    .expect(201);

  const response = await request(app)
    .get('/api/inventory/boost-purchase-limits')
    .set('Authorization', token)
    .expect(200);

  assert.equal(response.body.monthKey, getBoostPurchaseMonthKey());
  assert.equal(response.body.maxQuantity, 20);
  assert.equal(response.body.purchases['small-boost'], 2);
});

test('habit custom frequency stores customDays properly', async () => {
  const user = await buildUser();
  const token = authHeader(user);

  // Create a custom habit with specific days
  const createResponse = await request(app)
    .post('/api/habits')
    .set('Authorization', token)
    .send({
      title: 'Custom Workout',
      type: 'boolean',
      frequency: 'Custom',
      customDays: [1, 3, 5], // Mon, Wed, Fri
      category: 'Movement'
    })
    .expect(201);

  assert.equal(createResponse.body.data.frequency, 'Custom');
  assert.deepEqual(createResponse.body.data.customDays, [1, 3, 5]);
});

test('free users can create multiple habits', async () => {
  const user = await buildUser();
  const token = authHeader(user);

  for (let index = 1; index <= 3; index += 1) {
    await request(app)
      .post('/api/habits')
      .set('Authorization', token)
      .send({
        title: `Free Habit ${index}`,
        type: 'boolean',
        frequency: 'Daily',
        category: 'Movement',
      })
      .expect(201);
  }
});

test('premium users can create habits without hitting the plan limit', async () => {
  const user = await buildUser({ isPremium: true });
  const token = authHeader(user);

  for (let index = 1; index <= 3; index += 1) {
    await request(app)
      .post('/api/habits')
      .set('Authorization', token)
      .send({
        title: `Premium Habit ${index}`,
        type: 'boolean',
        frequency: 'Daily',
        category: 'Movement',
      })
      .expect(201);
  }
});
