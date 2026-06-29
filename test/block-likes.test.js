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
    await mongo.stop();
  }
});

test('blocking a user filters milestone reactions and story likes between them', async () => {
  // 1. Setup Users
  const userA = await buildUser({ username: 'user_a' });
  const userB = await buildUser({ username: 'user_b' });
  const sharedFriend = await buildUser({ username: 'friend_c' });

  // Make friends
  await makeFriends(userA, sharedFriend);
  await makeFriends(userB, sharedFriend);

  // 2. Create Habit & Milestone Post for Shared Friend
  const habit = await Habit.create({
    title: 'Coding',
    icon: '💻',
    type: 'boolean',
    frequency: 'Daily',
    ownerId: sharedFriend._id,
  });

  const milestone = await MilestonePost.create({
    user: sharedFriend._id,
    habit: habit._id,
    habitTitle: habit.title,
    streakDays: 10,
    visibleUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // User A and User B react to the Milestone Post
  await MilestoneLike.create({ milestonePost: milestone._id, user: userA._id, emoji: '🔥' });
  await MilestoneLike.create({ milestonePost: milestone._id, user: userB._id, emoji: '⭐' });

  // 3. Create Story for Shared Friend
  const story = await Story.create({
    user: sharedFriend._id,
    sourceType: 'habit',
    sourceId: habit._id,
    sourceTitle: habit.title,
    imageUrl: 'https://example.com/story.jpg',
    imagePublicId: 'howly/stories/test',
    feedExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    archiveExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });

  // User A and User B like the Story
  await StoryLike.create({ story: story._id, user: userA._id });
  await StoryLike.create({ story: story._id, user: userB._id });

  // 4. User A blocks User B
  await request(app)
    .post(`/api/social/block/${userB._id}`)
    .set('Authorization', authHeader(userA))
    .expect(200);

  // 5. Verify Milestone Post Reactions for User A
  const feedResA = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(userA))
    .expect(200);

  const milestoneFeedA = feedResA.body.find((item) => item.type === 'milestone');
  assert.ok(milestoneFeedA);
  // User A should only see their own reaction '🔥' in counts and list
  assert.equal(milestoneFeedA.reactions.length, 1);
  assert.equal(milestoneFeedA.reactions[0].emoji, '🔥');
  assert.equal(milestoneFeedA.reactions[0].user.username, 'user_a');
  
  const fireReaction = milestoneFeedA.reactionCounts.find(r => r.emoji === '🔥');
  const starReaction = milestoneFeedA.reactionCounts.find(r => r.emoji === '⭐');
  assert.ok(fireReaction);
  assert.equal(fireReaction.count, 1);
  assert.ok(!starReaction); // ⭐ from blocked user B should be excluded completely

  // 6. Verify Story likes count and list for User A
  const storyFeedA = feedResA.body.find((item) => item.type === 'story');
  assert.ok(storyFeedA);
  // likeCount should exclude blocked user's like
  assert.equal(storyFeedA.likeCount, 1);

  // Verify getStoryLikes output for User A
  const likesResA = await request(app)
    .get(`/api/stories/${story._id}/likes`)
    .set('Authorization', authHeader(userA))
    .expect(200);

  assert.equal(likesResA.body.length, 1);
  assert.equal(likesResA.body[0].username, 'user_a');

  // 7. Verify Shared Friend (C) who is not blocked sees both likes & reactions
  const feedResC = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(sharedFriend))
    .expect(200);

  const milestoneFeedC = feedResC.body.find((item) => item.type === 'milestone');
  assert.equal(milestoneFeedC.reactions.length, 2);

  const storyFeedC = feedResC.body.find((item) => item.type === 'story');
  assert.equal(storyFeedC.likeCount, 2);

  const likesResC = await request(app)
    .get(`/api/stories/${story._id}/likes`)
    .set('Authorization', authHeader(sharedFriend))
    .expect(200);

  assert.equal(likesResC.body.length, 2);
});
