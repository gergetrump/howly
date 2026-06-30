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
  assert.equal(milestoneFeedA.likeCount, 1);

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

test('milestone reaction count stays viewer-visible after blocking when reacting to a mutual friend milestone', async () => {
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

  const milestone = await MilestonePost.create({
    user: userA._id,
    habit: habitA._id,
    habitTitle: habitA.title,
    streakDays: 10,
    visibleUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await Promise.all([
    MilestoneLike.create({ milestonePost: milestone._id, user: userB._id, emoji: '🔥' }),
    MilestoneLike.create({ milestonePost: milestone._id, user: userC._id, emoji: '⭐' }),
  ]);
  await MilestonePost.updateOne({ _id: milestone._id }, { likeCount: 2 });

  await request(app)
    .post(`/api/social/block/${userC._id}`)
    .set('Authorization', authHeader(userB))
    .expect(200);

  const ownerFeedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(userA))
    .expect(200);
  const ownerMilestone = ownerFeedResponse.body.find((post) => post.type === 'milestone');
  assert.equal(ownerMilestone.likeCount, 2);
  assert.deepEqual(
    ownerMilestone.reactionCounts.toSorted((a, b) => a.emoji.localeCompare(b.emoji)),
    [
      { emoji: '⭐', count: 1 },
      { emoji: '🔥', count: 1 },
    ],
  );

  const blockerFeedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(userB))
    .expect(200);
  const blockerMilestone = blockerFeedResponse.body.find((post) => post.type === 'milestone');
  assert.equal(blockerMilestone.likeCount, 1);
  assert.deepEqual(blockerMilestone.reactionCounts, [{ emoji: '🔥', count: 1 }]);

  const reactionResponse = await request(app)
    .post(`/api/milestones/${milestone._id}/like`)
    .set('Authorization', authHeader(userB))
    .send({ emoji: '💜' })
    .expect(200);

  assert.equal(reactionResponse.body.milestonePost.likeCount, 1);
  assert.deepEqual(reactionResponse.body.milestonePost.reactionCounts, [{ emoji: '💜', count: 1 }]);
  assert.deepEqual(reactionResponse.body.milestonePost.currentUserReactions, ['💜']);

  const blockedFeedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(userC))
    .expect(200);
  const blockedMilestone = blockedFeedResponse.body.find((post) => post.type === 'milestone');
  assert.equal(blockedMilestone.likeCount, 1);
  assert.deepEqual(blockedMilestone.reactionCounts, [{ emoji: '⭐', count: 1 }]);
});

test('story likes list stays viewer-visible after toggling a like with a blocked user', async () => {
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
    imagePublicId: 'howly/stories/likes-toggle',
    feedExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    archiveExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });

  await Promise.all([
    StoryLike.create({ story: storyA._id, user: userB._id }),
    StoryLike.create({ story: storyA._id, user: userC._id }),
  ]);
  await Story.updateOne({ _id: storyA._id }, { likeCount: 2 });

  await request(app)
    .post(`/api/social/block/${userC._id}`)
    .set('Authorization', authHeader(userB))
    .expect(200);

  await request(app)
    .post(`/api/stories/${storyA._id}/like`)
    .set('Authorization', authHeader(userB))
    .expect(200);

  const likesAfterUnlikeResponse = await request(app)
    .get(`/api/stories/${storyA._id}/likes`)
    .set('Authorization', authHeader(userB))
    .expect(200);
  assert.equal(likesAfterUnlikeResponse.body.length, 0);

  const likeAgainResponse = await request(app)
    .post(`/api/stories/${storyA._id}/like`)
    .set('Authorization', authHeader(userB))
    .expect(200);
  assert.equal(likeAgainResponse.body.story.likeCount, 1);

  const likesAfterRelikeResponse = await request(app)
    .get(`/api/stories/${storyA._id}/likes`)
    .set('Authorization', authHeader(userB))
    .expect(200);
  assert.equal(likesAfterRelikeResponse.body.length, 1);
  assert.equal(likesAfterRelikeResponse.body[0].username, 'user_b');
});

test('removing a milestone reaction after blocking keeps visible reaction counts correct', async () => {
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

  const milestone = await MilestonePost.create({
    user: userA._id,
    habit: habitA._id,
    habitTitle: habitA.title,
    streakDays: 10,
    visibleUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await Promise.all([
    MilestoneLike.create({ milestonePost: milestone._id, user: userB._id, emoji: '🔥' }),
    MilestoneLike.create({ milestonePost: milestone._id, user: userC._id, emoji: '⭐' }),
  ]);
  await MilestonePost.updateOne({ _id: milestone._id }, { likeCount: 2 });

  await request(app)
    .post(`/api/social/block/${userC._id}`)
    .set('Authorization', authHeader(userB))
    .expect(200);

  const removeReactionResponse = await request(app)
    .post(`/api/milestones/${milestone._id}/like`)
    .set('Authorization', authHeader(userB))
    .send({ emoji: '🔥' })
    .expect(200);

  assert.equal(removeReactionResponse.body.liked, false);
  assert.equal(removeReactionResponse.body.milestonePost.likeCount, 0);
  assert.deepEqual(removeReactionResponse.body.milestonePost.reactionCounts, []);

  const ownerFeedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(userA))
    .expect(200);
  const ownerMilestone = ownerFeedResponse.body.find((post) => post.type === 'milestone');
  assert.equal(ownerMilestone.likeCount, 1);
  assert.deepEqual(ownerMilestone.reactionCounts, [{ emoji: '⭐', count: 1 }]);
});

test('premium milestone reactions stay viewer-visible after blocking another reactor', async () => {
  const userA = await buildUser({ username: 'user_a' });
  const premiumUserB = await buildUser({
    username: 'premium_b',
    isPremium: true,
  });
  const userC = await buildUser({ username: 'user_c' });

  await Promise.all([
    makeFriends(userA, premiumUserB),
    makeFriends(userA, userC),
    makeFriends(premiumUserB, userC),
  ]);

  const habitA = await Habit.create({
    title: 'Reading',
    icon: '📚',
    type: 'boolean',
    frequency: 'Daily',
    ownerId: userA._id,
  });

  const milestone = await MilestonePost.create({
    user: userA._id,
    habit: habitA._id,
    habitTitle: habitA.title,
    streakDays: 10,
    visibleUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await Promise.all([
    MilestoneLike.create({ milestonePost: milestone._id, user: premiumUserB._id, emoji: '🎉' }),
    MilestoneLike.create({ milestonePost: milestone._id, user: premiumUserB._id, emoji: '💜' }),
    MilestoneLike.create({ milestonePost: milestone._id, user: userC._id, emoji: '⭐' }),
  ]);
  await MilestonePost.updateOne({ _id: milestone._id }, { likeCount: 3 });

  await request(app)
    .post(`/api/social/block/${userC._id}`)
    .set('Authorization', authHeader(premiumUserB))
    .expect(200);

  const blockerFeedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(premiumUserB))
    .expect(200);
  const blockerMilestone = blockerFeedResponse.body.find((post) => post.type === 'milestone');
  assert.equal(blockerMilestone.likeCount, 2);
  assert.deepEqual(
    blockerMilestone.reactionCounts.toSorted((a, b) => a.emoji.localeCompare(b.emoji)),
    [
      { emoji: '🎉', count: 1 },
      { emoji: '💜', count: 1 },
    ],
  );

  const thirdReactionResponse = await request(app)
    .post(`/api/milestones/${milestone._id}/like`)
    .set('Authorization', authHeader(premiumUserB))
    .send({ emoji: '✨' })
    .expect(200);

  assert.equal(thirdReactionResponse.body.milestonePost.likeCount, 3);
  assert.deepEqual(
    thirdReactionResponse.body.milestonePost.reactionCounts.toSorted((a, b) => a.emoji.localeCompare(b.emoji)),
    [
      { emoji: '✨', count: 1 },
      { emoji: '🎉', count: 1 },
      { emoji: '💜', count: 1 },
    ],
  );
  assert.deepEqual(thirdReactionResponse.body.milestonePost.currentUserReactions, ['🎉', '💜', '✨']);
});
