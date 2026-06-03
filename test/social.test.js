import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import Habit from '../src/features/habits/habit.model.js';
import {
  FriendRequest,
  Friendship,
  MilestoneLike,
  MilestonePost,
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
    fullName: overrides.fullName || 'Test User',
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
  process.env.JWT_SECRET = 'test-secret';
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
  app = createApp();
});

// Clear all collections touched by social flows between tests
afterEach(async () => {
  await Promise.all([
    FriendRequest.deleteMany({}),
    Friendship.deleteMany({}),
    MilestoneLike.deleteMany({}),
    MilestonePost.deleteMany({}),
    Habit.deleteMany({}),
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

// Tests that friends can see milestone posts and like or unlike them
test('social feed shows friends milestones and toggles likes', async () => {
  const author = await buildUser({ username: 'author', email: 'author@example.com' });
  const friend = await buildUser({ username: 'friend', email: 'friend@example.com' });
  const habit = await Habit.create({
    title: 'Chess',
    type: 'boolean',
    user: author._id,
    streak: 10,
  });

  await Friendship.create({
    userA: author._id,
    userB: friend._id,
  });

  // Create a visible 10-day milestone for the author's habit
  const milestonePost = await MilestonePost.create({
    user: author._id,
    habit: habit._id,
    habitTitle: habit.title,
    streakDays: habit.streak,
  });

  // Friends can see the milestone in their feed
  const feedResponse = await request(app)
    .get('/api/social/feed')
    .set('Authorization', authHeader(friend))
    .expect(200);

  assert.equal(feedResponse.body.length, 1);
  assert.equal(feedResponse.body[0].id, milestonePost._id.toString());
  assert.equal(feedResponse.body[0].habit.title, 'Chess');
  assert.equal(feedResponse.body[0].likedByCurrentUser, false);

  // First click likes the milestone
  const likeResponse = await request(app)
    .post(`/api/social/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(friend))
    .expect(200);

  assert.equal(likeResponse.body.liked, true);
  assert.equal(likeResponse.body.milestonePost.likeCount, 1);
  assert.equal(likeResponse.body.milestonePost.likedByCurrentUser, true);

  // Second click removes the like
  const unlikeResponse = await request(app)
    .post(`/api/social/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(friend))
    .expect(200);

  assert.equal(unlikeResponse.body.liked, false);
  assert.equal(unlikeResponse.body.milestonePost.likeCount, 0);
});
