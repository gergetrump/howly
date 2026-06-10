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

// Create users with unique defaults so tests do not collide on email/username
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

// Start an isolated in-memory database for the social test suite
before(async () => {
  config.jwtSecret = 'test-secret';
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
  app = createApp();
});

// Clear all collections touched by social flows between tests
afterEach(async () => {
  await Promise.all([
    FriendRequest.deleteMany({}),
    Friendship.deleteMany({}),
    User.deleteMany({}),
  ]);
});

// Close database resources after the suite finishes
after(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

// Tests that one user can send a friend request and the recipient can accept it
test('social flow sends and accepts friend requests', async () => {
  const requester = await buildUser({ username: 'sender', email: 'sender@example.com' });
  const recipient = await buildUser({ username: 'receiver', email: 'receiver@example.com' });

  const createResponse = await request(app)
    .post('/api/social/friends/requests')
    .set('Authorization', authHeader(requester))
    .send({ recipientId: recipient._id.toString() })
    .expect(201);

  assert.equal(createResponse.body.status, 'pending');
  assert.equal(createResponse.body.requester.id, requester._id.toString());
  assert.equal(createResponse.body.recipient.id, recipient._id.toString());

  // The recipient should see the request as incoming
  const incomingResponse = await request(app)
    .get('/api/social/friends/requests')
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(incomingResponse.body.incoming.length, 1);
  assert.equal(incomingResponse.body.outgoing.length, 0);

  // Accepting the request creates the friendship record
  const acceptResponse = await request(app)
    .post(`/api/social/friends/requests/${createResponse.body.id}/accept`)
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(acceptResponse.body.request.status, 'accepted');
  assert.equal(acceptResponse.body.friendship.friend.id, requester._id.toString());

  // The requester can now see the recipient in their friend list
  const friendsResponse = await request(app)
    .get('/api/social/friends')
    .set('Authorization', authHeader(requester))
    .expect(200);

  assert.equal(friendsResponse.body.length, 1);
  assert.equal(friendsResponse.body[0].friend.id, recipient._id.toString());
});
