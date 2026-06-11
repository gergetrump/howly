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
import config from '../config.js';

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

  // 5. Verify deletion
  const listAfterDelete = await request(app)
    .get('/api/habits')
    .set('Authorization', token)
    .expect(200);

  assert.equal(listAfterDelete.body.data.length, 0);
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

test('free users can create only two habits', async () => {
  const user = await buildUser();
  const token = authHeader(user);

  for (let index = 1; index <= 2; index += 1) {
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

  const response = await request(app)
    .post('/api/habits')
    .set('Authorization', token)
    .send({
      title: 'Third Free Habit',
      type: 'boolean',
      frequency: 'Daily',
      category: 'Movement',
    })
    .expect(403);

  assert.equal(response.body.errorCode, 'HABIT_LIMIT_REACHED');
});

test('premium users can create six habits but not seven', async () => {
  const user = await buildUser({ isPremium: true });
  const token = authHeader(user);

  for (let index = 1; index <= 6; index += 1) {
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

  const response = await request(app)
    .post('/api/habits')
    .set('Authorization', token)
    .send({
      title: 'Seventh Premium Habit',
      type: 'boolean',
      frequency: 'Daily',
      category: 'Movement',
    })
    .expect(403);

  assert.equal(response.body.errorCode, 'HABIT_LIMIT_REACHED');
});
