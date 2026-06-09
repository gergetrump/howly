import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import Companion from '../src/features/companion/companion.model.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import Habit from '../src/features/habits/habit.model.js';
import config from '../config.js';
import {
  FriendRequest,
  Friendship,
} from '../src/features/social/social.model.js';
import {
  MilestoneLike,
  MilestonePost,
} from '../src/features/milestones/milestone.model.js';
import { createMilestonePostForHabit } from '../src/features/milestones/milestone.service.js';
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

// Create a habit using the current habit schema fields
async function buildHabit(owner, overrides = {}) {
  return Habit.create({
    title: overrides.title || 'Chess',
    type: overrides.type || 'boolean',
    frequency: overrides.frequency || 'Daily',
    ownerId: owner._id,
    streakCount: overrides.streakCount ?? 10,
    ...overrides,
  });
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
    MilestoneLike.deleteMany({}),
    MilestonePost.deleteMany({}),
    Companion.deleteMany({}),
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
test('social feed shows friends milestones and toggles emoji reactions', async () => {
  const author = await buildUser({ username: 'author', email: 'author@example.com' });
  const friend = await buildUser({ username: 'friend', email: 'friend@example.com' });
  const habit = await buildHabit(author, { title: 'Chess', streakCount: 10 });
  const companion = await Companion.create({ user: author._id, name: 'Luna' });

  await Friendship.create({
    userA: author._id,
    userB: friend._id,
  });

  // Create a visible 10-day milestone for the author's habit
  const milestonePost = await MilestonePost.create({
    user: author._id,
    habit: habit._id,
    habitTitle: habit.title,
    streakDays: habit.streakCount,
  });

  // Friends can see the milestone in their feed
  const feedResponse = await request(app)
    .get('/api/social/feed')
    .set('Authorization', authHeader(friend))
    .expect(200);

  assert.equal(feedResponse.body.length, 1);
  assert.equal(feedResponse.body[0].id, milestonePost._id.toString());
  assert.equal(feedResponse.body[0].habit.title, 'Chess');
  assert.equal(feedResponse.body[0].habit.frequency, 'Daily');
  assert.equal(feedResponse.body[0].habit.icon, '🎯');
  assert.equal(feedResponse.body[0].companion.id, companion._id.toString());
  assert.equal(feedResponse.body[0].companion.name, 'Luna');
  assert.equal(feedResponse.body[0].likedByCurrentUser, false);
  assert.equal(feedResponse.body[0].currentUserReaction, null);
  assert.deepEqual(feedResponse.body[0].reactionCounts, []);

  // First reaction adds the selected emoji
  const firstReactionResponse = await request(app)
    .post(`/api/social/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(friend))
    .send({ emoji: '🎉' })
    .expect(200);

  assert.equal(firstReactionResponse.body.liked, true);
  assert.equal(firstReactionResponse.body.milestonePost.likeCount, 1);
  assert.equal(firstReactionResponse.body.milestonePost.likedByCurrentUser, true);
  assert.equal(firstReactionResponse.body.milestonePost.currentUserReaction, '🎉');
  assert.deepEqual(firstReactionResponse.body.milestonePost.reactionCounts, [{ emoji: '🎉', count: 1 }]);
  assert.equal(firstReactionResponse.body.milestonePost.habit.frequency, 'Daily');
  assert.equal(firstReactionResponse.body.milestonePost.habit.icon, '🎯');
  assert.equal(firstReactionResponse.body.milestonePost.companion.name, 'Luna');

  // Choosing another emoji changes the user's single reaction
  const changedReactionResponse = await request(app)
    .post(`/api/social/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(friend))
    .send({ emoji: '🔥' })
    .expect(200);

  assert.equal(changedReactionResponse.body.liked, true);
  assert.equal(changedReactionResponse.body.milestonePost.likeCount, 1);
  assert.equal(changedReactionResponse.body.milestonePost.currentUserReaction, '🔥');
  assert.deepEqual(changedReactionResponse.body.milestonePost.reactionCounts, [{ emoji: '🔥', count: 1 }]);
  assert.equal(await MilestoneLike.countDocuments({ milestonePost: milestonePost._id, user: friend._id }), 1);

  // Clicking the same emoji again removes the reaction
  const removedReactionResponse = await request(app)
    .post(`/api/social/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(friend))
    .send({ emoji: '🔥' })
    .expect(200);

  assert.equal(removedReactionResponse.body.liked, false);
  assert.equal(removedReactionResponse.body.milestonePost.likeCount, 0);
  assert.equal(removedReactionResponse.body.milestonePost.currentUserReaction, null);
  assert.deepEqual(removedReactionResponse.body.milestonePost.reactionCounts, []);
  assert.equal(removedReactionResponse.body.milestonePost.habit.frequency, 'Daily');
  assert.equal(removedReactionResponse.body.milestonePost.habit.icon, '🎯');
  assert.equal(removedReactionResponse.body.milestonePost.companion.name, 'Luna');
});

// Tests that milestone posts are created only for 10-day streak intervals
test('milestone creation only creates posts at 10-day streak intervals', async () => {
  const author = await buildUser({ username: 'milestone_author', email: 'milestone-author@example.com' });
  const nineDayHabit = await buildHabit(author, { title: 'Reading', streakCount: 9 });
  const tenDayHabit = await buildHabit(author, { title: 'Chess', streakCount: 10 });
  const elevenDayHabit = await buildHabit(author, { title: 'Running', streakCount: 11 });
  const twentyDayHabit = await buildHabit(author, { title: 'Writing', streakCount: 20 });

  const nineDayResult = await createMilestonePostForHabit(nineDayHabit);
  const tenDayResult = await createMilestonePostForHabit(tenDayHabit);
  const elevenDayResult = await createMilestonePostForHabit(elevenDayHabit);
  const twentyDayResult = await createMilestonePostForHabit(twentyDayHabit);

  assert.equal(nineDayResult.milestonePost, null);
  assert.equal(elevenDayResult.milestonePost, null);
  assert.equal(tenDayResult.milestonePost.streakDays, 10);
  assert.equal(tenDayResult.milestonePost.user.toString(), author._id.toString());
  assert.equal(twentyDayResult.milestonePost.streakDays, 20);

  const storedPosts = await MilestonePost.find({ user: author._id }).sort({ streakDays: 1 });
  assert.deepEqual(storedPosts.map((post) => post.streakDays), [10, 20]);
});

// Tests that checking in a 9-day habit creates the 10-day milestone through the real habit route
test('habit check-in creates a milestone when streak reaches 10 days', async () => {
  const author = await buildUser({ username: 'checkin_author', email: 'checkin-author@example.com' });
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const habit = await buildHabit(author, {
    title: 'Reading',
    streakCount: 9,
    lastCompletedAt: yesterday,
  });

  const checkInResponse = await request(app)
    .post(`/api/habits/${habit._id}/check-ins`)
    .set('Authorization', authHeader(author))
    .expect(200);

  assert.equal(checkInResponse.body.data.streakCount, 10);
  assert.equal(checkInResponse.body.milestonePost.habitTitle, 'Reading');
  assert.equal(checkInResponse.body.milestonePost.streakDays, 10);

  const milestonePost = await MilestonePost.findOne({
    habit: habit._id,
    streakDays: 10,
  });

  assert.ok(milestonePost);
  assert.equal(milestonePost.user.toString(), author._id.toString());
  assert.equal(milestonePost.habitTitle, 'Reading');
});

// Tests that creating the same habit milestone twice reuses the existing post
test('milestone creation is idempotent for the same habit and streak', async () => {
  const author = await buildUser({ username: 'idempotent_author', email: 'idempotent-author@example.com' });
  const habit = await buildHabit(author, { title: 'Reading', streakCount: 10 });

  const firstResult = await createMilestonePostForHabit(habit);
  const secondResult = await createMilestonePostForHabit(habit);

  assert.equal(firstResult.milestonePost._id.toString(), secondResult.milestonePost._id.toString());
  assert.equal(await MilestonePost.countDocuments({ habit: habit._id, streakDays: 10 }), 1);
});

// Tests that the friend feed hides expired milestones and non-friend milestones
test('social feed only shows visible milestones from self and friends', async () => {
  const currentUser = await buildUser({ username: 'feed_viewer', email: 'feed-viewer@example.com' });
  const friend = await buildUser({ username: 'feed_friend', email: 'feed-friend@example.com' });
  const stranger = await buildUser({ username: 'feed_stranger', email: 'feed-stranger@example.com' });
  const friendHabit = await buildHabit(friend, { title: 'Friend habit', streakCount: 10 });
  const expiredFriendHabit = await buildHabit(friend, { title: 'Expired habit', streakCount: 20 });
  const strangerHabit = await buildHabit(stranger, { title: 'Stranger habit', streakCount: 10 });
  const ownHabit = await buildHabit(currentUser, { title: 'Own habit', streakCount: 10 });

  await Friendship.create({ userA: currentUser._id, userB: friend._id });

  const visibleFriendPost = await MilestonePost.create({
    user: friend._id,
    habit: friendHabit._id,
    habitTitle: friendHabit.title,
    streakDays: 10,
  });
  const ownPost = await MilestonePost.create({
    user: currentUser._id,
    habit: ownHabit._id,
    habitTitle: ownHabit.title,
    streakDays: 10,
  });
  await MilestonePost.create({
    user: friend._id,
    habit: expiredFriendHabit._id,
    habitTitle: expiredFriendHabit.title,
    streakDays: 20,
    visibleUntil: new Date(Date.now() - 60 * 1000),
  });
  await MilestonePost.create({
    user: stranger._id,
    habit: strangerHabit._id,
    habitTitle: strangerHabit.title,
    streakDays: 10,
  });

  const feedResponse = await request(app)
    .get('/api/social/feed')
    .set('Authorization', authHeader(currentUser))
    .expect(200);

  const feedPostIds = feedResponse.body.map((post) => post.id);

  assert.equal(feedResponse.body.length, 2);
  assert.ok(feedPostIds.includes(visibleFriendPost._id.toString()));
  assert.ok(feedPostIds.includes(ownPost._id.toString()));
  assert.ok(feedResponse.body.every((post) => post.visibleUntil));
});

// Tests that users can like their own milestones but cannot like a stranger's milestone
test('milestone likes allow own milestones and reject non-friend milestones', async () => {
  const currentUser = await buildUser({ username: 'like_viewer', email: 'like-viewer@example.com' });
  const stranger = await buildUser({ username: 'like_stranger', email: 'like-stranger@example.com' });
  const ownHabit = await buildHabit(currentUser, { title: 'Own habit', streakCount: 10 });
  const strangerHabit = await buildHabit(stranger, { title: 'Stranger habit', streakCount: 10 });
  const ownPost = await MilestonePost.create({
    user: currentUser._id,
    habit: ownHabit._id,
    habitTitle: ownHabit.title,
    streakDays: 10,
  });
  const strangerPost = await MilestonePost.create({
    user: stranger._id,
    habit: strangerHabit._id,
    habitTitle: strangerHabit.title,
    streakDays: 10,
  });

  const ownLikeResponse = await request(app)
    .post(`/api/social/milestones/${ownPost._id}/like`)
    .set('Authorization', authHeader(currentUser))
    .send({ emoji: '💜' })
    .expect(200);

  assert.equal(ownLikeResponse.body.liked, true);
  assert.equal(ownLikeResponse.body.milestonePost.likeCount, 1);
  assert.equal(ownLikeResponse.body.milestonePost.likedByCurrentUser, true);
  assert.equal(ownLikeResponse.body.milestonePost.currentUserReaction, '💜');

  const strangerLikeResponse = await request(app)
    .post(`/api/social/milestones/${strangerPost._id}/like`)
    .set('Authorization', authHeader(currentUser))
    .send({ emoji: '💜' })
    .expect(400);

  assert.equal(strangerLikeResponse.body.code, 'MILESTONE_POST_NOT_FOUND');
});
