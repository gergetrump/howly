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

// Tests that a pending request blocks duplicate requests in either direction
test('social flow rejects duplicate pending friend requests in reverse direction', async () => {
  const requester = await buildUser({ username: 'reverse_sender', email: 'reverse_sender@example.com' });
  const recipient = await buildUser({ username: 'reverse_receiver', email: 'reverse_receiver@example.com' });

  await request(app)
    .post('/api/social/friends/requests')
    .set('Authorization', authHeader(requester))
    .send({ recipientId: recipient._id.toString() })
    .expect(201);

  const duplicateResponse = await request(app)
    .post('/api/social/friends/requests')
    .set('Authorization', authHeader(recipient))
    .send({ recipientId: requester._id.toString() })
    .expect(400);

  assert.equal(duplicateResponse.body.code, 'PENDING_FRIEND_REQUEST_EXISTS');
  assert.equal(await FriendRequest.countDocuments({ status: 'pending' }), 1);
});

// Tests that rejecting a request does not create a friendship
test('social flow rejects friend requests without creating friendships', async () => {
  const requester = await buildUser({ username: 'reject_sender', email: 'reject_sender@example.com' });
  const recipient = await buildUser({ username: 'reject_receiver', email: 'reject_receiver@example.com' });

  const createResponse = await request(app)
    .post('/api/social/friends/requests')
    .set('Authorization', authHeader(requester))
    .send({ recipientId: recipient._id.toString() })
    .expect(201);

  const rejectResponse = await request(app)
    .post(`/api/social/friends/requests/${createResponse.body.id}/reject`)
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(rejectResponse.body.status, 'rejected');
  assert.equal(await Friendship.countDocuments(), 0);

  const requestsResponse = await request(app)
    .get('/api/social/friends/requests')
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(requestsResponse.body.incoming.length, 0);
});

// Tests that only the recipient can accept a pending friend request
test('social flow prevents non-recipients from accepting friend requests', async () => {
  const requester = await buildUser({ username: 'owner_sender', email: 'owner_sender@example.com' });
  const recipient = await buildUser({ username: 'owner_receiver', email: 'owner_receiver@example.com' });
  const otherUser = await buildUser({ username: 'owner_other', email: 'owner_other@example.com' });

  const createResponse = await request(app)
    .post('/api/social/friends/requests')
    .set('Authorization', authHeader(requester))
    .send({ recipientId: recipient._id.toString() })
    .expect(201);

  const acceptResponse = await request(app)
    .post(`/api/social/friends/requests/${createResponse.body.id}/accept`)
    .set('Authorization', authHeader(otherUser))
    .expect(404);

  assert.equal(acceptResponse.body.code, 'PENDING_FRIEND_REQUEST_NOT_FOUND');
  assert.equal(await Friendship.countDocuments(), 0);
});

// Tests that deleting a friendship removes it from both users' friend lists
test('social flow deletes friendships for both users', async () => {
  const requester = await buildUser({ username: 'delete_sender', email: 'delete_sender@example.com' });
  const recipient = await buildUser({ username: 'delete_receiver', email: 'delete_receiver@example.com' });

  const createResponse = await request(app)
    .post('/api/social/friends/requests')
    .set('Authorization', authHeader(requester))
    .send({ recipientId: recipient._id.toString() })
    .expect(201);

  const acceptResponse = await request(app)
    .post(`/api/social/friends/requests/${createResponse.body.id}/accept`)
    .set('Authorization', authHeader(recipient))
    .expect(200);

  await request(app)
    .delete(`/api/social/friends/${acceptResponse.body.friendship.id}`)
    .set('Authorization', authHeader(requester))
    .expect(204);

  const requesterFriendsResponse = await request(app)
    .get('/api/social/friends')
    .set('Authorization', authHeader(requester))
    .expect(200);

  const recipientFriendsResponse = await request(app)
    .get('/api/social/friends')
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(requesterFriendsResponse.body.length, 0);
  assert.equal(recipientFriendsResponse.body.length, 0);
  assert.equal(await Friendship.countDocuments(), 0);
});

test('GET /api/social/friends supports limit and offset pagination', async () => {
  const currentUser = await buildUser({ username: 'paged_friends_owner', email: 'paged-friends-owner@example.com' });
  const friends = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      buildUser({
        username: `paged_friend_${index}`,
        email: `paged-friend-${index}@example.com`,
      })
    )
  );

  await Friendship.insertMany(
    friends.map((friend, index) => ({
      userA: currentUser._id,
      userB: friend._id,
      createdAt: new Date(Date.now() + index),
      updatedAt: new Date(Date.now() + index),
    }))
  );

  const firstPage = await request(app)
    .get('/api/social/friends?limit=10&offset=0')
    .set('Authorization', authHeader(currentUser))
    .expect(200);

  assert.equal(firstPage.body.items.length, 10);
  assert.equal(firstPage.body.hasMore, true);
  assert.equal(firstPage.body.nextOffset, 10);

  const secondPage = await request(app)
    .get('/api/social/friends?limit=10&offset=10')
    .set('Authorization', authHeader(currentUser))
    .expect(200);

  assert.equal(secondPage.body.items.length, 2);
  assert.equal(secondPage.body.hasMore, false);
  assert.equal(secondPage.body.nextOffset, 12);
});

test('GET /api/social/friends/requests supports incoming request pagination', async () => {
  const recipient = await buildUser({ username: 'paged_request_recipient', email: 'paged-request-recipient@example.com' });
  const requesters = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      buildUser({
        username: `paged_requester_${index}`,
        email: `paged-requester-${index}@example.com`,
      })
    )
  );

  await FriendRequest.insertMany(
    requesters.map((requester, index) => ({
      requester: requester._id,
      recipient: recipient._id,
      status: 'pending',
      createdAt: new Date(Date.now() + index),
      updatedAt: new Date(Date.now() + index),
    }))
  );

  const firstPage = await request(app)
    .get('/api/social/friends/requests?incomingLimit=10&incomingOffset=0&outgoingLimit=50&outgoingOffset=0')
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(firstPage.body.incoming.items.length, 10);
  assert.equal(firstPage.body.incoming.hasMore, true);
  assert.equal(firstPage.body.incoming.nextOffset, 10);
  assert.equal(firstPage.body.outgoing.items.length, 0);

  const secondPage = await request(app)
    .get('/api/social/friends/requests?incomingLimit=10&incomingOffset=10&outgoingLimit=50&outgoingOffset=0')
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(secondPage.body.incoming.items.length, 2);
  assert.equal(secondPage.body.incoming.hasMore, false);
  assert.equal(secondPage.body.incoming.nextOffset, 12);
});
