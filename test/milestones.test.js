import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import createApp from '../src/app.js';
import connectDB from '../src/config/database.js';
import Companion from '../src/features/companion/companion.model.js';
import Item from '../src/features/items/item.model.js';
import UserItem from '../src/features/inventory/inventory.model.js';
import { signAccessToken } from '../src/features/auth/auth.service.js';
import Habit from '../src/features/habits/habit.model.js';
import config from '../config.js';
import { Friendship } from '../src/features/social/social.model.js';
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

// Start an isolated in-memory database for the milestone test suite
before(async () => {
  config.jwtSecret = 'test-secret';
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
  app = createApp();
});

// Clear all collections touched by milestone flows between tests
afterEach(async () => {
  await Promise.all([
    Friendship.deleteMany({}),
    MilestoneLike.deleteMany({}),
    MilestonePost.deleteMany({}),
    Companion.deleteMany({}),
    Item.deleteMany({}),
    UserItem.deleteMany({}),
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

// Tests that friends can see milestone posts and toggle one emoji reaction
test('social feed shows friends milestones and toggles emoji reactions', async () => {
  const author = await buildUser({ username: 'author', email: 'author@example.com' });
  const friend = await buildUser({ username: 'friend', email: 'friend@example.com' });
  const habit = await buildHabit(author, { title: 'Chess', streakCount: 10 });
  const companion = await Companion.create({ user: author._id, name: 'Luna' });
  const hoodie = await Item.create({
    name: 'Cozy Hoodie',
    type: 'clothing',
    price: 300,
    assetKey: 'hoodie',
  });
  const glasses = await Item.create({
    name: 'Glasses',
    type: 'accessory',
    price: 180,
    assetKey: 'glasses',
  });
  const cup = await Item.create({
    name: 'Cup',
    type: 'accessory',
    price: 120,
    assetKey: 'cup',
  });

  await UserItem.create([
    { user: author._id, item: hoodie._id, equipped: true },
    { user: author._id, item: glasses._id, equipped: true },
    { user: author._id, item: cup._id, equipped: false },
  ]);

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
  assert.deepEqual(feedResponse.body[0].companion.equippedItemKeys.sort(), ['glasses', 'hoodie']);
  assert.equal(feedResponse.body[0].likedByCurrentUser, false);
  assert.equal(feedResponse.body[0].currentUserReaction, null);
  assert.deepEqual(feedResponse.body[0].reactionCounts, []);
  assert.deepEqual(feedResponse.body[0].reactions, []);

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
  assert.equal(firstReactionResponse.body.milestonePost.reactions.length, 1);
  assert.equal(firstReactionResponse.body.milestonePost.reactions[0].emoji, '🎉');
  assert.equal(firstReactionResponse.body.milestonePost.reactions[0].user.id, friend._id.toString());
  assert.equal(firstReactionResponse.body.milestonePost.reactions[0].user.username, 'friend');
  assert.equal(firstReactionResponse.body.milestonePost.reactions[0].user.email, undefined);
  assert.equal(firstReactionResponse.body.milestonePost.habit.frequency, 'Daily');
  assert.equal(firstReactionResponse.body.milestonePost.habit.icon, '🎯');
  assert.equal(firstReactionResponse.body.milestonePost.companion.name, 'Luna');
  assert.deepEqual(firstReactionResponse.body.milestonePost.companion.equippedItemKeys.sort(), ['glasses', 'hoodie']);

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
  assert.equal(changedReactionResponse.body.milestonePost.reactions[0].emoji, '🔥');
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
  assert.deepEqual(removedReactionResponse.body.milestonePost.reactions, []);
  assert.equal(removedReactionResponse.body.milestonePost.habit.frequency, 'Daily');
  assert.equal(removedReactionResponse.body.milestonePost.habit.icon, '🎯');
  assert.equal(removedReactionResponse.body.milestonePost.companion.name, 'Luna');
  assert.deepEqual(removedReactionResponse.body.milestonePost.companion.equippedItemKeys.sort(), ['glasses', 'hoodie']);
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
  await Companion.create({ user: author._id, name: 'Howly' });
  const hoodie = await Item.create({
    name: 'Check-in Hoodie',
    type: 'clothing',
    price: 300,
    assetKey: 'checkin-hoodie',
  });
  await UserItem.create({ user: author._id, item: hoodie._id, equipped: true });
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
  assert.equal(checkInResponse.body.milestonePost.habit.title, 'Reading');
  assert.equal(checkInResponse.body.milestonePost.streakDays, 10);
  assert.deepEqual(checkInResponse.body.milestonePost.companion.equippedItemKeys, ['checkin-hoodie']);

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

// Tests that outfit keys are returned even when the user has no companion document yet
test('social feed includes equipped outfit with default companion data', async () => {
  const currentUser = await buildUser({ username: 'default_companion_viewer', email: 'default-viewer@example.com' });
  const friend = await buildUser({ username: 'default_companion_friend', email: 'default-friend@example.com' });
  const habit = await buildHabit(friend, { title: 'Reading', streakCount: 10 });
  const glasses = await Item.create({
    name: 'Default Glasses',
    type: 'accessory',
    price: 180,
    assetKey: 'default-glasses',
  });

  await Friendship.create({ userA: currentUser._id, userB: friend._id });
  await UserItem.create({ user: friend._id, item: glasses._id, equipped: true });
  await MilestonePost.create({
    user: friend._id,
    habit: habit._id,
    habitTitle: habit.title,
    streakDays: 10,
  });

  const feedResponse = await request(app)
    .get('/api/social/feed')
    .set('Authorization', authHeader(currentUser))
    .expect(200);

  assert.equal(feedResponse.body.length, 1);
  assert.equal(feedResponse.body[0].companion.id, null);
  assert.equal(feedResponse.body[0].companion.name, 'Howly');
  assert.deepEqual(feedResponse.body[0].companion.equippedItemKeys, ['default-glasses']);
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
