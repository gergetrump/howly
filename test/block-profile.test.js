import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import config from '../config.js';
import User from '../src/features/users/user.model.js';

let mongo;
let app;

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
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

after(async () => {
  await mongoose.connection.close();
  await mongo.stop();
});

test('GET /api/users/profile/:username returns user details when no block exists', async () => {
  const userA = await buildUser({ username: 'usera' });
  const userB = await buildUser({ username: 'userb' });

  const res = await request(app)
    .get(`/api/users/profile/${userB.username}`)
    .set('Authorization', authHeader(userA));

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.username, userB.username);
});

test('GET /api/users/profile/:username returns 403 Forbidden when the current user has blocked the target user', async () => {
  const userA = await buildUser({ username: 'usera' });
  const userB = await buildUser({ username: 'userb' });

  // userA blocks userB
  userA.blockedUsers.push(userB._id);
  await userA.save();

  const res = await request(app)
    .get(`/api/users/profile/${userB.username}`)
    .set('Authorization', authHeader(userA));

  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.errorCode, 'BLOCKED');
});

test('GET /api/users/profile/:username returns 403 Forbidden when the target user has blocked the current user', async () => {
  const userA = await buildUser({ username: 'usera' });
  const userB = await buildUser({ username: 'userb' });

  // userB blocks userA
  userB.blockedUsers.push(userA._id);
  await userB.save();

  const res = await request(app)
    .get(`/api/users/profile/${userB.username}`)
    .set('Authorization', authHeader(userA));

  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.errorCode, 'BLOCKED');
});

test('GET /api/users/profile/:username returns 404 when user does not exist', async () => {
  const userA = await buildUser({ username: 'usera' });

  const res = await request(app)
    .get('/api/users/profile/nonexistentuser')
    .set('Authorization', authHeader(userA));

  assert.strictEqual(res.status, 404);
});

test('GET /api/users/profile/:username treats regex-looking usernames literally', async () => {
  const userA = await buildUser({ username: 'usera' });
  await buildUser({ username: 'targetuser' });

  const res = await request(app)
    .get('/api/users/profile/.*')
    .set('Authorization', authHeader(userA));

  assert.strictEqual(res.status, 404);
});

test('GET /api/social/blockers returns usernames of users who blocked the current user', async () => {
  const userA = await buildUser({ username: 'usera' });
  const userB = await buildUser({ username: 'userb' });

  // userB blocks userA
  userB.blockedUsers.push(userA._id);
  await userB.save();

  const res = await request(app)
    .get('/api/social/blockers')
    .set('Authorization', authHeader(userA));

  assert.strictEqual(res.status, 200);
  assert.ok(res.body.includes(userB.username));
});
