import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import config from '../config.js';
import { FriendRequest, Friendship } from '../src/features/social/social.model.js';
import { Notification } from '../src/features/notifications/notification.model.js';
import { createNotification } from '../src/features/notifications/notification.service.js';
import User from '../src/features/users/user.model.js';

let mongo;
let app;

async function buildUser(overrides = {}) {
  const suffix = Math.random().toString(36).slice(2, 10);

  return User.create({
    username: overrides.username || `notification_user_${suffix}`,
    email: overrides.email || `notification_user_${suffix}@example.com`,
    firstName: overrides.firstName || 'Notification',
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
    Notification.deleteMany({}),
    User.deleteMany({}),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

test('friend requests create unread notifications for the recipient', async () => {
  const requester = await buildUser({ username: 'requester' });
  const recipient = await buildUser({ username: 'recipient' });

  await request(app)
    .post('/api/social/friends/requests')
    .set('Authorization', authHeader(requester))
    .send({ recipientId: recipient._id.toString() })
    .expect(201);

  const recipientCount = await request(app)
    .get('/api/notifications/unread-count')
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(recipientCount.body.unreadCount, 1);

  const requesterCount = await request(app)
    .get('/api/notifications/unread-count')
    .set('Authorization', authHeader(requester))
    .expect(200);

  assert.equal(requesterCount.body.unreadCount, 0);

  const notification = await Notification.findOne({ recipient: recipient._id }).lean();

  assert.equal(notification.type, 'friend_request_received');
  assert.equal(notification.actor.toString(), requester._id.toString());
});

test('muted notification preferences suppress matching notifications', async () => {
  const requester = await buildUser({ username: 'muted_requester' });
  const recipient = await buildUser({
    username: 'muted_recipient',
    notificationPreferences: {
      muteAll: false,
      muteTag: false,
      muteFriendRequest: true,
      muteComment: false,
      muteLike: false,
      muteReaction: false,
    },
  });

  await request(app)
    .post('/api/social/friends/requests')
    .set('Authorization', authHeader(requester))
    .send({ recipientId: recipient._id.toString() })
    .expect(201);

  const recipientCount = await request(app)
    .get('/api/notifications/unread-count')
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(recipientCount.body.unreadCount, 0);
  assert.equal(await Notification.countDocuments({ recipient: recipient._id }), 0);
});

test('notifications can be marked as read', async () => {
  const actor = await buildUser({ username: 'actor' });
  const recipient = await buildUser({ username: 'reader' });

  await Notification.create({
    recipient: recipient._id,
    actor: actor._id,
    type: 'friend_request_received',
    entityType: 'friendRequest',
    entityId: new mongoose.Types.ObjectId(),
  });

  await request(app)
    .post('/api/notifications/read')
    .set('Authorization', authHeader(recipient))
    .send({ types: ['friend_request_received'] })
    .expect(200);

  const count = await request(app)
    .get('/api/notifications/unread-count')
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(count.body.unreadCount, 0);
});

test('notifications support limit and offset pagination', async () => {
  const actor = await buildUser({ username: 'page_actor' });
  const recipient = await buildUser({ username: 'page_recipient' });
  const entityId = new mongoose.Types.ObjectId();

  await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      createNotification({
        recipientId: recipient._id,
        actorId: actor._id,
        type: 'story_commented',
        entityType: 'story',
        entityId,
        metadata: { index },
      })
    )
  );

  const firstPage = await request(app)
    .get('/api/notifications?limit=10&offset=0')
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(firstPage.body.items.length, 10);
  assert.equal(firstPage.body.hasMore, true);
  assert.equal(firstPage.body.nextOffset, 10);

  const secondPage = await request(app)
    .get('/api/notifications?limit=10&offset=10')
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(secondPage.body.items.length, 2);
  assert.equal(secondPage.body.hasMore, false);
  assert.equal(secondPage.body.nextOffset, 12);
});

test('deduplicated notifications do not become unread again when reused', async () => {
  const actor = await buildUser({ username: 'dedupe_actor' });
  const recipient = await buildUser({ username: 'dedupe_recipient' });
  const storyId = new mongoose.Types.ObjectId();

  await createNotification({
    recipientId: recipient._id,
    actorId: actor._id,
    type: 'story_liked',
    entityType: 'story',
    entityId: storyId,
    metadata: { likeCount: 1 },
    deduplicate: true,
  });

  const firstNotification = await Notification.findOne({
    recipient: recipient._id,
    actor: actor._id,
    type: 'story_liked',
    entityId: storyId,
  });

  assert.ok(firstNotification);
  assert.equal(firstNotification.readAt, null);

  const readAt = new Date();
  firstNotification.readAt = readAt;
  await firstNotification.save();

  await createNotification({
    recipientId: recipient._id,
    actorId: actor._id,
    type: 'story_liked',
    entityType: 'story',
    entityId: storyId,
    metadata: { likeCount: 2 },
    deduplicate: true,
  });

  const notifications = await Notification.find({
    recipient: recipient._id,
    actor: actor._id,
    type: 'story_liked',
    entityId: storyId,
  }).lean();

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].readAt.toISOString(), readAt.toISOString());
  assert.equal(notifications[0].metadata.likeCount, 2);
});

test('accepting a friend request notifies the original requester', async () => {
  const requester = await buildUser({ username: 'sender' });
  const recipient = await buildUser({ username: 'receiver' });

  const createResponse = await request(app)
    .post('/api/social/friends/requests')
    .set('Authorization', authHeader(requester))
    .send({ recipientId: recipient._id.toString() })
    .expect(201);

  await request(app)
    .post(`/api/social/friends/requests/${createResponse.body.id}/accept`)
    .set('Authorization', authHeader(recipient))
    .expect(200);

  const requesterCount = await request(app)
    .get('/api/notifications/unread-count')
    .set('Authorization', authHeader(requester))
    .expect(200);

  assert.equal(requesterCount.body.unreadCount, 1);

  const notification = await Notification.findOne({
    recipient: requester._id,
    type: 'friend_request_accepted',
  }).lean();

  assert.equal(notification.actor.toString(), recipient._id.toString());
});

test('clear all removes only the current users notifications', async () => {
  const actor = await buildUser({ username: 'clear_actor' });
  const recipient = await buildUser({ username: 'clear_recipient' });
  const otherRecipient = await buildUser({ username: 'other_recipient' });

  await Notification.create([
    {
      recipient: recipient._id,
      actor: actor._id,
      type: 'story_liked',
      entityType: 'story',
      entityId: new mongoose.Types.ObjectId(),
    },
    {
      recipient: recipient._id,
      actor: actor._id,
      type: 'story_commented',
      entityType: 'story',
      entityId: new mongoose.Types.ObjectId(),
    },
    {
      recipient: otherRecipient._id,
      actor: actor._id,
      type: 'story_liked',
      entityType: 'story',
      entityId: new mongoose.Types.ObjectId(),
    },
  ]);

  const response = await request(app)
    .delete('/api/notifications')
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(response.body.deletedCount, 2);
  assert.equal(await Notification.countDocuments({ recipient: recipient._id }), 0);
  assert.equal(await Notification.countDocuments({ recipient: otherRecipient._id }), 1);
});

test('single notification delete removes only owned notification', async () => {
  const actor = await buildUser({ username: 'single_delete_actor' });
  const recipient = await buildUser({ username: 'single_delete_recipient' });
  const otherRecipient = await buildUser({ username: 'single_delete_other' });

  const [ownedNotification, otherNotification] = await Notification.create([
    {
      recipient: recipient._id,
      actor: actor._id,
      type: 'story_liked',
      entityType: 'story',
      entityId: new mongoose.Types.ObjectId(),
    },
    {
      recipient: otherRecipient._id,
      actor: actor._id,
      type: 'story_liked',
      entityType: 'story',
      entityId: new mongoose.Types.ObjectId(),
    },
  ]);

  await request(app)
    .delete(`/api/notifications/${otherNotification._id}`)
    .set('Authorization', authHeader(recipient))
    .expect(404);

  await request(app)
    .delete(`/api/notifications/${ownedNotification._id}`)
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(await Notification.exists({ _id: ownedNotification._id }), null);
  assert.ok(await Notification.exists({ _id: otherNotification._id }));
});

test('single notification read marks only owned notification', async () => {
  const actor = await buildUser({ username: 'single_read_actor' });
  const recipient = await buildUser({ username: 'single_read_recipient' });
  const otherRecipient = await buildUser({ username: 'single_read_other' });

  const [ownedNotification, otherNotification] = await Notification.create([
    {
      recipient: recipient._id,
      actor: actor._id,
      type: 'story_commented',
      entityType: 'story',
      entityId: new mongoose.Types.ObjectId(),
    },
    {
      recipient: otherRecipient._id,
      actor: actor._id,
      type: 'story_commented',
      entityType: 'story',
      entityId: new mongoose.Types.ObjectId(),
    },
  ]);

  await request(app)
    .post(`/api/notifications/${otherNotification._id}/read`)
    .set('Authorization', authHeader(recipient))
    .expect(404);

  const response = await request(app)
    .post(`/api/notifications/${ownedNotification._id}/read`)
    .set('Authorization', authHeader(recipient))
    .expect(200);

  assert.equal(response.body.id, ownedNotification._id.toString());
  assert.ok(response.body.readAt);

  const updatedOwnedNotification = await Notification.findById(ownedNotification._id).lean();
  const updatedOtherNotification = await Notification.findById(otherNotification._id).lean();

  assert.ok(updatedOwnedNotification.readAt);
  assert.equal(updatedOtherNotification.readAt, null);
});
