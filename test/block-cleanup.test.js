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
import { Story, StoryLike } from '../src/features/stories/story.model.js';
import { Friendship } from '../src/features/social/social.model.js';

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

async function makeFriends(firstUser, secondUser) {
  const [userA, userB] = [firstUser._id.toString(), secondUser._id.toString()].sort();
  return Friendship.create({ userA, userB });
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
    Friendship.deleteMany({}),
    Habit.deleteMany({}),
    MilestonePost.deleteMany({}),
    MilestoneLike.deleteMany({}),
    Story.deleteMany({}),
    StoryLike.deleteMany({}),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  if (mongo) {
    mongo.stop();
  }
});

test('blocking a user deletes their likes and reactions on each other posts, and unblocking does not restore them', async () => {
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
  });

  // User B likes User A's story
  await StoryLike.create({ story: storyA._id, user: userB._id });

  // 4. Verify likes/reactions exist in the database
  assert.equal(await StoryLike.countDocuments({ user: userB._id }), 1);
  assert.equal(await MilestoneLike.countDocuments({ user: userB._id }), 1);

  // 5. User A blocks User B
  await request(app)
    .post(`/api/social/block/${userB._id}`)
    .set('Authorization', authHeader(userA))
    .expect(200);

  // Assert likes/reactions are permanently deleted from database
  assert.equal(await StoryLike.countDocuments({ user: userB._id }), 0);
  assert.equal(await MilestoneLike.countDocuments({ user: userB._id }), 0);

  // Assert counts on the post documents are updated to 0
  const updatedStory = await Story.findById(storyA._id);
  assert.equal(updatedStory.likeCount, 0);

  const updatedMilestone = await MilestonePost.findById(milestoneA._id);
  assert.equal(updatedMilestone.likeCount, 0);

  // 6. User A unblocks User B
  await request(app)
    .post(`/api/social/unblock/${userB._id}`)
    .set('Authorization', authHeader(userA))
    .expect(200);

  // Verify that likes and reactions are NOT restored
  assert.equal(await StoryLike.countDocuments({ user: userB._id }), 0);
  assert.equal(await MilestoneLike.countDocuments({ user: userB._id }), 0);
});
