import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import config from '../config.js';
import {
  FriendRequest,
  Friendship,
} from '../src/features/social/social.model.js';
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
  await Promise.all([
    FriendRequest.deleteMany({}),
    Friendship.deleteMany({}),
    User.deleteMany({}),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

test('blocking a user severs friendship, rejects pending requests, and filters search', async () => {
  const userA = await buildUser({ username: 'usera', email: 'usera@example.com' });
  const userB = await buildUser({ username: 'userb', email: 'userb@example.com' });

  const tokenA = authHeader(userA);
  const tokenB = authHeader(userB);

  // 1. Establish friendship
  const friendReq = await FriendRequest.create({
    requester: userA._id,
    recipient: userB._id,
    status: 'pending',
  });

  await request(app)
    .post(`/api/social/friends/requests/${friendReq._id.toString()}/accept`)
    .set('Authorization', tokenB)
    .expect(200);

  // Assert friendship exists
  assert.equal(await Friendship.countDocuments({}), 1);

  // 2. User A blocks User B
  const blockRes = await request(app)
    .post(`/api/social/block/${userB._id.toString()}`)
    .set('Authorization', tokenA)
    .expect(200);

  assert.equal(blockRes.body.blocked, true);

  // Assert friendship is deleted
  assert.equal(await Friendship.countDocuments({}), 0);
  assert.equal(await FriendRequest.countDocuments({}), 0);

  // Assert B is in A's blockedUsers
  const updatedUserA = await User.findById(userA._id);
  assert.equal(updatedUserA.blockedUsers.length, 1);
  assert.equal(updatedUserA.blockedUsers[0].toString(), userB._id.toString());

  // 3. User B cannot search User A
  const searchBRes = await request(app)
    .get(`/api/users/search?query=${userA.username}`)
    .set('Authorization', tokenB)
    .expect(200);

  assert.equal(searchBRes.body.length, 0);

  // 4. User B cannot send a friend request to User A (returns 404)
  await request(app)
    .post('/api/social/friends/requests')
    .set('Authorization', tokenB)
    .send({ recipientId: userA._id.toString() })
    .expect(404);

  // 5. User A lists blocked users
  const listBlockedRes = await request(app)
    .get('/api/social/blocked')
    .set('Authorization', tokenA)
    .expect(200);

  assert.equal(listBlockedRes.body.length, 1);
  assert.equal(listBlockedRes.body[0].username, userB.username);

  // 6. User A unblocks User B
  const unblockRes = await request(app)
    .post(`/api/social/unblock/${userB._id.toString()}`)
    .set('Authorization', tokenA)
    .expect(200);

  assert.equal(unblockRes.body.unblocked, true);

  const finalUserA = await User.findById(userA._id);
  assert.equal(finalUserA.blockedUsers.length, 0);

  // 7. Friend request is now allowed again
  await request(app)
    .post('/api/social/friends/requests')
    .set('Authorization', tokenB)
    .send({ recipientId: userA._id.toString() })
    .expect(201);
});
