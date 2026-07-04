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
import Habit from '../src/features/habits/habit.model.js';
import { MilestonePost, MilestoneLike } from '../src/features/milestones/milestone.model.js';
import { Story, StoryLike, StoryComment } from '../src/features/stories/story.model.js';
import { FriendRequest, Friendship } from '../src/features/social/social.model.js';
import { Notification } from '../src/features/notifications/notification.model.js';

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
    ...overrides,
  });
}

async function makeFriends(firstUser, secondUser) {
  const [userA, userB] = [firstUser._id.toString(), secondUser._id.toString()].sort();
  return Friendship.create({ userA, userB });
}

async function buildHabit(owner, overrides = {}) {
  return Habit.create({
    title: overrides.title || 'Reading',
    icon: overrides.icon || '📚',
    type: 'boolean',
    frequency: 'Daily',
    ownerId: owner._id,
    ...overrides,
  });
}

async function buildStory(owner, habit, overrides = {}) {
  return Story.create({
    user: owner._id,
    sourceType: 'habit',
    sourceId: habit._id,
    sourceTitle: habit.title,
    imageUrl: 'https://example.com/story.jpg',
    imagePublicId: overrides.imagePublicId || `howly/stories/${owner.username}`,
    feedExpiresAt: new Date(Date.now() + 7 * DAY_IN_MS),
    archiveExpiresAt: new Date(Date.now() + 90 * DAY_IN_MS),
    ...overrides,
  });
}

function notificationBetweenUsers(firstUser, secondUser) {
  return {
    $or: [
      { actor: firstUser._id, recipient: secondUser._id },
      { actor: secondUser._id, recipient: firstUser._id },
    ],
  };
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
    User.deleteMany({}),
    FriendRequest.deleteMany({}),
    Friendship.deleteMany({}),
    Habit.deleteMany({}),
    MilestonePost.deleteMany({}),
    MilestoneLike.deleteMany({}),
    Story.deleteMany({}),
    StoryLike.deleteMany({}),
    StoryComment.deleteMany({}),
    Notification.deleteMany({}),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  if (mongo) {
    mongo.stop();
  }
});

test('blocking a user deletes their likes, reactions, and comments on each other posts, and unblocking does not restore them', async () => {
  // 1. Setup Users and Friendship
  const userA = await buildUser({ username: 'user_a' });
  const userB = await buildUser({ username: 'user_b' });
  await makeFriends(userA, userB);

  // 2. Create Habit & Milestone Post for User A
  const habitA = await Habit.create({
    title: 'Workout',
    icon: '💪',
    type: 'boolean',
    frequency: 'Daily',
    ownerId: userA._id,
  });

  const milestoneA = await MilestonePost.create({
    user: userA._id,
    habit: habitA._id,
    habitTitle: habitA.title,
    streakDays: 10,
    visibleUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    likeCount: 1,
  });

  // User B reacts to User A's milestone
  await MilestoneLike.create({ milestonePost: milestoneA._id, user: userB._id, emoji: '🔥' });

  // 3. Create Story for User A
  const storyA = await Story.create({
    user: userA._id,
    sourceType: 'habit',
    sourceId: habitA._id,
    sourceTitle: habitA.title,
    imageUrl: 'https://example.com/story.jpg',
    imagePublicId: 'howly/stories/testA',
    feedExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    archiveExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    likeCount: 1,
    commentCount: 2,
  });

  // User B likes User A's story
  await StoryLike.create({ story: storyA._id, user: userB._id });

  // User B comments on User A's story, and User A replies to B's comment
  const commentB = await StoryComment.create({
    story: storyA._id,
    user: userB._id,
    content: 'Nice job!',
  });

  await StoryComment.create({
    story: storyA._id,
    user: userA._id,
    content: 'Thanks!',
    parentComment: commentB._id,
  });

  // 4. Verify likes, reactions, and comments exist in the database
  assert.equal(await StoryLike.countDocuments({ user: userB._id }), 1);
  assert.equal(await MilestoneLike.countDocuments({ user: userB._id }), 1);
  assert.equal(await StoryComment.countDocuments({}), 2);

  // 5. User A blocks User B
  await request(app)
    .post(`/api/social/block/${userB._id}`)
    .set('Authorization', authHeader(userA))
    .expect(200);

  // Assert likes, reactions, and comments are permanently deleted from database
  assert.equal(await StoryLike.countDocuments({ user: userB._id }), 0);
  assert.equal(await MilestoneLike.countDocuments({ user: userB._id }), 0);
  assert.equal(await StoryComment.countDocuments({}), 0);

  // Assert counts on the post documents are updated to 0
  const updatedStory = await Story.findById(storyA._id);
  assert.equal(updatedStory.likeCount, 0);
  assert.equal(updatedStory.commentCount, 0);

  const updatedMilestone = await MilestonePost.findById(milestoneA._id);
  assert.equal(updatedMilestone.likeCount, 0);

  // 6. User A unblocks User B
  await request(app)
    .post(`/api/social/unblock/${userB._id}`)
    .set('Authorization', authHeader(userA))
    .expect(200);

  // Verify that likes, reactions, and comments are NOT restored
  assert.equal(await StoryLike.countDocuments({ user: userB._id }), 0);
  assert.equal(await MilestoneLike.countDocuments({ user: userB._id }), 0);
  assert.equal(await StoryComment.countDocuments({}), 0);
});

test('blocking a user hides their comments on a mutual friend story', async () => {
  const userA = await buildUser({ username: 'user_a' });
  const userB = await buildUser({ username: 'user_b' });
  const friendC = await buildUser({ username: 'friend_c' });

  await makeFriends(userA, friendC);
  await makeFriends(userB, friendC);

  const habitC = await Habit.create({
    title: 'Reading',
    icon: '📚',
    type: 'boolean',
    frequency: 'Daily',
    ownerId: friendC._id,
  });

  const storyC = await Story.create({
    user: friendC._id,
    sourceType: 'habit',
    sourceId: habitC._id,
    sourceTitle: habitC.title,
    imageUrl: 'https://example.com/story.jpg',
    imagePublicId: 'howly/stories/testC',
    feedExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    archiveExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });

  // User B comments on C's story
  await StoryComment.create({
    story: storyC._id,
    user: userB._id,
    content: 'Awesome story!',
  });

  // User A blocks User B
  await request(app)
    .post(`/api/social/block/${userB._id}`)
    .set('Authorization', authHeader(userA))
    .expect(200);

  // User A gets comments for C's story
  const commentsRes = await request(app)
    .get(`/api/stories/${storyC._id}/comments`)
    .set('Authorization', authHeader(userA))
    .expect(200);

  // User A should not see User B's comment
  assert.equal(commentsRes.body.length, 0);
});

test('unfriending after a comment preserves historical owner notification but removes future story access', async () => {
  const userA = await buildUser({ username: 'case1_a', firstName: 'Alex' });
  const userB = await buildUser({ username: 'case1_b', firstName: 'Blair' });
  const friendship = await makeFriends(userA, userB);
  const habitB = await buildHabit(userB);
  const storyB = await buildStory(userB, habitB, { imagePublicId: 'howly/stories/unfriend-after-comment' });

  const commentResponse = await request(app)
    .post(`/api/stories/${storyB._id}/comments`)
    .set('Authorization', authHeader(userA))
    .send({ content: 'Nice post @case1_b' })
    .expect(201);

  await request(app)
    .delete(`/api/social/friends/${friendship._id}`)
    .set('Authorization', authHeader(userA))
    .expect(204);

  assert.ok(await StoryComment.exists({ _id: commentResponse.body.id }));

  const notification = await Notification.findOne({
    recipient: userB._id,
    actor: userA._id,
    type: 'story_tagged',
  }).lean();

  assert.ok(notification);
  assert.equal(notification.metadata.commentId.toString(), commentResponse.body.id);

  await request(app)
    .get(`/api/stories/${storyB._id}/comments`)
    .set('Authorization', authHeader(userB))
    .expect(200);

  await request(app)
    .get(`/api/stories/${storyB._id}/comments`)
    .set('Authorization', authHeader(userA))
    .expect(404);
});

test('blocking deletes pending friend request and its notification', async () => {
  const userA = await buildUser({ username: 'request_blocker_a', firstName: 'Alex' });
  const userB = await buildUser({ username: 'request_blocker_b', firstName: 'Blair' });

  await request(app)
    .post('/api/social/friends/requests')
    .set('Authorization', authHeader(userA))
    .send({ recipientId: userB._id.toString() })
    .expect(201);

  assert.equal(await FriendRequest.countDocuments({ requester: userA._id, recipient: userB._id }), 1);
  assert.equal(
    await Notification.countDocuments({
      recipient: userB._id,
      actor: userA._id,
      type: 'friend_request_received',
    }),
    1,
  );

  await request(app)
    .post(`/api/social/block/${userA._id}`)
    .set('Authorization', authHeader(userB))
    .expect(200);

  assert.equal(await FriendRequest.countDocuments({}), 0);
  assert.equal(await Notification.countDocuments(notificationBetweenUsers(userA, userB)), 0);
});

test('blocking the post owner after commenting removes the comment and related notifications', async () => {
  const userA = await buildUser({ username: 'case2_a', firstName: 'Alex' });
  const userB = await buildUser({ username: 'case2_b', firstName: 'Blair' });
  await makeFriends(userA, userB);
  const habitB = await buildHabit(userB);
  const storyB = await buildStory(userB, habitB, { imagePublicId: 'howly/stories/commenter-blocks-owner' });

  const commentResponse = await request(app)
    .post(`/api/stories/${storyB._id}/comments`)
    .set('Authorization', authHeader(userA))
    .send({ content: 'Nice post @case2_b' })
    .expect(201);

  assert.ok(await StoryComment.exists({ _id: commentResponse.body.id }));
  assert.equal(await Notification.countDocuments(notificationBetweenUsers(userA, userB)), 1);

  await request(app)
    .post(`/api/social/block/${userB._id}`)
    .set('Authorization', authHeader(userA))
    .expect(200);

  assert.equal(await StoryComment.countDocuments({ story: storyB._id }), 0);
  assert.equal(await Notification.countDocuments(notificationBetweenUsers(userA, userB)), 0);
  assert.equal(await Friendship.countDocuments(), 0);

  const updatedStory = await Story.findById(storyB._id).lean();
  assert.equal(updatedStory.commentCount, 0);
});

test('blocking the commenter after they commented removes the comment and related notifications', async () => {
  const userA = await buildUser({ username: 'case3_a', firstName: 'Alex' });
  const userB = await buildUser({ username: 'case3_b', firstName: 'Blair' });
  await makeFriends(userA, userB);
  const habitB = await buildHabit(userB);
  const storyB = await buildStory(userB, habitB, { imagePublicId: 'howly/stories/owner-blocks-commenter' });

  const commentResponse = await request(app)
    .post(`/api/stories/${storyB._id}/comments`)
    .set('Authorization', authHeader(userA))
    .send({ content: 'Nice post @case3_b' })
    .expect(201);

  assert.ok(await StoryComment.exists({ _id: commentResponse.body.id }));
  assert.equal(await Notification.countDocuments(notificationBetweenUsers(userA, userB)), 1);

  await request(app)
    .post(`/api/social/block/${userA._id}`)
    .set('Authorization', authHeader(userB))
    .expect(200);

  assert.equal(await StoryComment.countDocuments({ story: storyB._id }), 0);
  assert.equal(await Notification.countDocuments(notificationBetweenUsers(userA, userB)), 0);
  assert.equal(await Friendship.countDocuments(), 0);

  const updatedStory = await Story.findById(storyB._id).lean();
  assert.equal(updatedStory.commentCount, 0);
});

test('story comment count stays viewer-visible after blocking when liking a mutual friend story', async () => {
  const userA = await buildUser({ username: 'user_a' });
  const userB = await buildUser({ username: 'user_b' });
  const userC = await buildUser({ username: 'user_c' });

  await Promise.all([
    makeFriends(userA, userB),
    makeFriends(userA, userC),
    makeFriends(userB, userC),
  ]);

  const habitA = await Habit.create({
    title: 'Reading',
    icon: '📚',
    type: 'boolean',
    frequency: 'Daily',
    ownerId: userA._id,
  });

  const storyA = await Story.create({
    user: userA._id,
    sourceType: 'habit',
    sourceId: habitA._id,
    sourceTitle: habitA.title,
    imageUrl: 'https://example.com/story.jpg',
    imagePublicId: 'howly/stories/testA',
    feedExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    archiveExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });

  await Promise.all([
    request(app)
      .post(`/api/stories/${storyA._id}/comments`)
      .set('Authorization', authHeader(userB))
      .send({ content: 'B first comment' })
      .expect(201),
    request(app)
      .post(`/api/stories/${storyA._id}/comments`)
      .set('Authorization', authHeader(userB))
      .send({ content: 'B second comment' })
      .expect(201),
    request(app)
      .post(`/api/stories/${storyA._id}/comments`)
      .set('Authorization', authHeader(userC))
      .send({ content: 'C first comment' })
      .expect(201),
    request(app)
      .post(`/api/stories/${storyA._id}/comments`)
      .set('Authorization', authHeader(userC))
      .send({ content: 'C second comment' })
      .expect(201),
  ]);

  await request(app)
    .post(`/api/social/block/${userC._id}`)
    .set('Authorization', authHeader(userB))
    .expect(200);

  const ownerFeedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(userA))
    .expect(200);
  const ownerStory = ownerFeedResponse.body.find((post) => post.type === 'story');
  assert.equal(ownerStory.commentCount, 4);

  const blockerFeedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(userB))
    .expect(200);
  const blockerStory = blockerFeedResponse.body.find((post) => post.type === 'story');
  assert.equal(blockerStory.commentCount, 2);

  const blockedFeedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(userC))
    .expect(200);
  const blockedStory = blockedFeedResponse.body.find((post) => post.type === 'story');
  assert.equal(blockedStory.commentCount, 2);

  const likeResponse = await request(app)
    .post(`/api/stories/${storyA._id}/like`)
    .set('Authorization', authHeader(userB))
    .expect(200);

  assert.equal(likeResponse.body.story.likeCount, 1);
  assert.equal(likeResponse.body.story.commentCount, 2);

  const commentsResponse = await request(app)
    .get(`/api/stories/${storyA._id}/comments`)
    .set('Authorization', authHeader(userB))
    .expect(200);

  assert.equal(commentsResponse.body.length, 2);

  await request(app)
    .post(`/api/stories/${storyA._id}/comments`)
    .set('Authorization', authHeader(userB))
    .send({ content: 'B third visible comment' })
    .expect(201);

  const blockerFeedAfterCommentResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(userB))
    .expect(200);
  const blockerStoryAfterComment = blockerFeedAfterCommentResponse.body.find((post) => post.type === 'story');
  assert.equal(blockerStoryAfterComment.commentCount, 3);

  const commentsAfterCommentResponse = await request(app)
    .get(`/api/stories/${storyA._id}/comments`)
    .set('Authorization', authHeader(userB))
    .expect(200);
  assert.equal(commentsAfterCommentResponse.body.length, 3);

  const ownerFeedAfterCommentResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(userA))
    .expect(200);
  const ownerStoryAfterComment = ownerFeedAfterCommentResponse.body.find((post) => post.type === 'story');
  assert.equal(ownerStoryAfterComment.commentCount, 5);
});

test('deleting a visible comment after blocking keeps story comment counts viewer-visible', async () => {
  const userA = await buildUser({ username: 'user_a' });
  const userB = await buildUser({ username: 'user_b' });
  const userC = await buildUser({ username: 'user_c' });

  await Promise.all([
    makeFriends(userA, userB),
    makeFriends(userA, userC),
    makeFriends(userB, userC),
  ]);

  const habitA = await Habit.create({
    title: 'Reading',
    icon: '📚',
    type: 'boolean',
    frequency: 'Daily',
    ownerId: userA._id,
  });

  const storyA = await Story.create({
    user: userA._id,
    sourceType: 'habit',
    sourceId: habitA._id,
    sourceTitle: habitA.title,
    imageUrl: 'https://example.com/story.jpg',
    imagePublicId: 'howly/stories/delete-visible-comment',
    feedExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    archiveExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });

  const bComments = [];
  for (const content of ['B first comment', 'B second comment', 'B third comment']) {
    const response = await request(app)
      .post(`/api/stories/${storyA._id}/comments`)
      .set('Authorization', authHeader(userB))
      .send({ content })
      .expect(201);
    bComments.push(response.body);
  }

  await Promise.all([
    request(app)
      .post(`/api/stories/${storyA._id}/comments`)
      .set('Authorization', authHeader(userC))
      .send({ content: 'C first comment' })
      .expect(201),
    request(app)
      .post(`/api/stories/${storyA._id}/comments`)
      .set('Authorization', authHeader(userC))
      .send({ content: 'C second comment' })
      .expect(201),
  ]);

  await request(app)
    .post(`/api/social/block/${userC._id}`)
    .set('Authorization', authHeader(userB))
    .expect(200);

  await request(app)
    .delete(`/api/stories/${storyA._id}/comments/${bComments[0].id}`)
    .set('Authorization', authHeader(userB))
    .expect(204);

  const blockerCommentsResponse = await request(app)
    .get(`/api/stories/${storyA._id}/comments`)
    .set('Authorization', authHeader(userB))
    .expect(200);
  assert.equal(blockerCommentsResponse.body.length, 2);

  const blockerFeedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(userB))
    .expect(200);
  const blockerStory = blockerFeedResponse.body.find((post) => post.type === 'story');
  assert.equal(blockerStory.commentCount, 2);

  const ownerFeedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(userA))
    .expect(200);
  const ownerStory = ownerFeedResponse.body.find((post) => post.type === 'story');
  assert.equal(ownerStory.commentCount, 4);
});
