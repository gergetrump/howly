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
  Story,
  StoryLike,
  StoryComment,
  STORY_FEED_VISIBLE_HOURS,
} from '../src/features/stories/story.model.js';
import { Friendship } from '../src/features/social/social.model.js';
import Habit from '../src/features/habits/habit.model.js';
import User from '../src/features/users/user.model.js';

let mongo;
let app;

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

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

async function buildHabit(owner, overrides = {}) {
  return Habit.create({
    title: overrides.title || 'Morning Run',
    icon: overrides.icon || '🏃',
    type: 'boolean',
    frequency: 'Daily',
    ownerId: owner._id,
    ...overrides,
  });
}

// Create a story directly in the database (skips the Cloudinary upload)
async function buildStory(owner, habit, overrides = {}) {
  const now = Date.now();
  return Story.create({
    user: owner._id,
    sourceType: 'habit',
    sourceId: habit._id,
    sourceTitle: habit.title,
    sourceEmoji: habit.icon,
    imageUrl: 'https://example.com/story.jpg',
    imagePublicId: 'howly/stories/test',
    caption: '',
    feedExpiresAt: new Date(now + STORY_FEED_VISIBLE_HOURS * HOUR_IN_MS),
    archiveExpiresAt: new Date(now + 90 * DAY_IN_MS),
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

// Start an isolated in-memory database for the stories test suite
before(async () => {
  config.jwtSecret = 'test-secret';
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
  app = createApp();
});

// Clear all collections touched by story flows between tests
afterEach(async () => {
  await Promise.all([
    Story.deleteMany({}),
    StoryLike.deleteMany({}),
    StoryComment.deleteMany({}),
    Friendship.deleteMany({}),
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

// --- POST /api/stories (validation paths, no Cloudinary involved) ---

test('POST /api/stories without an image returns 400', async () => {
  const user = await buildUser();
  const habit = await buildHabit(user);

  const response = await request(app)
    .post('/api/stories')
    .set('Authorization', authHeader(user))
    .field('sourceType', 'habit')
    .field('sourceId', habit._id.toString())
    .expect(400);

  assert.match(response.body.message, /image/i);
});

test('POST /api/stories with invalid sourceType returns 400', async () => {
  const user = await buildUser();
  const habit = await buildHabit(user);

  const response = await request(app)
    .post('/api/stories')
    .set('Authorization', authHeader(user))
    .field('sourceType', 'invalid-type')
    .field('sourceId', habit._id.toString())
    .attach('image', Buffer.from('fake-image'), 'photo.jpg')
    .expect(400);

  assert.match(response.body.message, /sourceType/);
});

test('POST /api/stories for a habit that is not yours returns 404', async () => {
  const user = await buildUser();
  const otherUser = await buildUser();
  const foreignHabit = await buildHabit(otherUser);

  await request(app)
    .post('/api/stories')
    .set('Authorization', authHeader(user))
    .field('sourceType', 'habit')
    .field('sourceId', foreignHabit._id.toString())
    .attach('image', Buffer.from('fake-image'), 'photo.jpg')
    .expect(404);
});

// --- GET /api/stories/me and /me/archive ---

test('GET /api/stories/me returns only stories still visible in the feed', async () => {
  const user = await buildUser();
  const habit = await buildHabit(user);

  const activeStory = await buildStory(user, habit);
  await buildStory(user, habit, {
    feedExpiresAt: new Date(Date.now() - HOUR_IN_MS), // expired for the feed
  });

  const response = await request(app)
    .get('/api/stories/me')
    .set('Authorization', authHeader(user))
    .expect(200);

  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, activeStory._id.toString());
  assert.equal(response.body[0].sourceType, 'habit');
  assert.equal(response.body[0].sourceTitle, habit.title);
});

test('GET /api/stories/me/archive also includes feed-expired stories', async () => {
  const user = await buildUser();
  const habit = await buildHabit(user);

  await buildStory(user, habit);
  await buildStory(user, habit, {
    feedExpiresAt: new Date(Date.now() - HOUR_IN_MS),
  });

  const response = await request(app)
    .get('/api/stories/me/archive')
    .set('Authorization', authHeader(user))
    .expect(200);

  assert.equal(response.body.length, 2);
});

// --- Mixed feed (GET /api/milestones/feed) ---

test('GET /api/milestones/feed contains friend stories with type "story"', async () => {
  const user = await buildUser();
  const friend = await buildUser();
  const stranger = await buildUser();
  await makeFriends(user, friend);

  const friendHabit = await buildHabit(friend);
  const strangerHabit = await buildHabit(stranger);

  const friendStory = await buildStory(friend, friendHabit, { caption: 'Done!' });
  await buildStory(stranger, strangerHabit); // must not appear
  await buildStory(friend, friendHabit, {
    feedExpiresAt: new Date(Date.now() - HOUR_IN_MS), // expired, must not appear
  });

  const response = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(user))
    .expect(200);

  const stories = response.body.filter((post) => post.type === 'story');

  assert.equal(stories.length, 1);
  assert.equal(stories[0].id, friendStory._id.toString());
  assert.equal(stories[0].caption, 'Done!');
  assert.equal(stories[0].likedByCurrentUser, false);
  assert.equal(stories[0].user.id, friend._id.toString());
});

test('GET /api/milestones/feed includes the user\'s own active stories', async () => {
  const user = await buildUser();
  const habit = await buildHabit(user);
  await buildStory(user, habit);

  const response = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(user))
    .expect(200);

  const stories = response.body.filter((post) => post.type === 'story');

  assert.equal(stories.length, 1);
  assert.equal(stories[0].user.id, user._id.toString());
});

// --- POST /api/stories/:storyId/like ---

test('a friend can like and unlike a story (toggle)', async () => {
  const owner = await buildUser();
  const friend = await buildUser();
  await makeFriends(owner, friend);

  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  const likeResponse = await request(app)
    .post(`/api/stories/${story._id}/like`)
    .set('Authorization', authHeader(friend))
    .expect(200);

  assert.equal(likeResponse.body.liked, true);
  assert.equal(likeResponse.body.story.likeCount, 1);
  assert.equal(likeResponse.body.story.likedByCurrentUser, true);

  const unlikeResponse = await request(app)
    .post(`/api/stories/${story._id}/like`)
    .set('Authorization', authHeader(friend))
    .expect(200);

  assert.equal(unlikeResponse.body.liked, false);
  assert.equal(unlikeResponse.body.story.likeCount, 0);
});

test('users can like and unlike their own story', async () => {
  const owner = await buildUser();
  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  const likeResponse = await request(app)
    .post(`/api/stories/${story._id}/like`)
    .set('Authorization', authHeader(owner))
    .expect(200);

  assert.equal(likeResponse.body.liked, true);
  assert.equal(likeResponse.body.story.likeCount, 1);
  assert.equal(likeResponse.body.story.likedByCurrentUser, true);

  const unlikeResponse = await request(app)
    .post(`/api/stories/${story._id}/like`)
    .set('Authorization', authHeader(owner))
    .expect(200);

  assert.equal(unlikeResponse.body.liked, false);
  assert.equal(unlikeResponse.body.story.likeCount, 0);
});

test('non-friends cannot like a story (404)', async () => {
  const owner = await buildUser();
  const stranger = await buildUser();
  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  await request(app)
    .post(`/api/stories/${story._id}/like`)
    .set('Authorization', authHeader(stranger))
    .expect(404);
});

test('liking a feed-expired story returns 404', async () => {
  const owner = await buildUser();
  const friend = await buildUser();
  await makeFriends(owner, friend);

  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit, {
    feedExpiresAt: new Date(Date.now() - HOUR_IN_MS),
  });

  await request(app)
    .post(`/api/stories/${story._id}/like`)
    .set('Authorization', authHeader(friend))
    .expect(404);
});

// --- GET /api/stories/:storyId/likes ---

test('the owner can see who liked their story', async () => {
  const owner = await buildUser();
  const friend = await buildUser({ username: 'liker', firstName: 'Lia' });
  await makeFriends(owner, friend);

  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  await request(app)
    .post(`/api/stories/${story._id}/like`)
    .set('Authorization', authHeader(friend))
    .expect(200);

  const response = await request(app)
    .get(`/api/stories/${story._id}/likes`)
    .set('Authorization', authHeader(owner))
    .expect(200);

  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].username, 'liker');
  assert.ok(!('passwordHash' in response.body[0]));
});

test('friends can see who liked a visible story', async () => {
  const owner = await buildUser();
  const friend = await buildUser({ username: 'viewer' });
  const liker = await buildUser({ username: 'story_liker' });
  await makeFriends(owner, friend);
  await makeFriends(owner, liker);

  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  await request(app)
    .post(`/api/stories/${story._id}/like`)
    .set('Authorization', authHeader(liker))
    .expect(200);

  const response = await request(app)
    .get(`/api/stories/${story._id}/likes`)
    .set('Authorization', authHeader(friend))
    .expect(200);

  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].username, 'story_liker');
});

test('strangers cannot see who liked a story', async () => {
  const owner = await buildUser();
  const stranger = await buildUser();
  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  await request(app)
    .get(`/api/stories/${story._id}/likes`)
    .set('Authorization', authHeader(stranger))
    .expect(404);
});

// --- DELETE /api/stories/:storyId ---

test('the owner can delete their story along with its likes', async () => {
  const owner = await buildUser();
  const friend = await buildUser();
  await makeFriends(owner, friend);

  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  await request(app)
    .post(`/api/stories/${story._id}/like`)
    .set('Authorization', authHeader(friend))
    .expect(200);

  await request(app)
    .delete(`/api/stories/${story._id}`)
    .set('Authorization', authHeader(owner))
    .expect(204);

  assert.equal(await Story.countDocuments({}), 0);
  assert.equal(await StoryLike.countDocuments({}), 0);
});

test('users cannot delete stories of other users (404)', async () => {
  const owner = await buildUser();
  const otherUser = await buildUser();
  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  await request(app)
    .delete(`/api/stories/${story._id}`)
    .set('Authorization', authHeader(otherUser))
    .expect(404);

  assert.equal(await Story.countDocuments({}), 1);
});

// --- Story Comments ---

test('a user can comment on their own story and see the comment list', async () => {
  const owner = await buildUser();
  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  const commentResponse = await request(app)
    .post(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(owner))
    .send({ content: 'Nice story!' })
    .expect(201);

  assert.equal(commentResponse.body.content, 'Nice story!');
  assert.equal(commentResponse.body.user.username, owner.username);

  const getResponse = await request(app)
    .get(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(owner))
    .expect(200);

  assert.equal(getResponse.body.length, 1);
  assert.equal(getResponse.body[0].content, 'Nice story!');
});

test('a friend can comment on a story and delete their comment', async () => {
  const owner = await buildUser();
  const friend = await buildUser();
  await makeFriends(owner, friend);

  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  const commentResponse = await request(app)
    .post(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(friend))
    .send({ content: 'Awesome!' })
    .expect(201);

  const commentId = commentResponse.body.id;

  // another user (owner) cannot delete friend's comment
  await request(app)
    .delete(`/api/stories/${story._id}/comments/${commentId}`)
    .set('Authorization', authHeader(owner))
    .expect(404);

  // friend can delete their own comment
  await request(app)
    .delete(`/api/stories/${story._id}/comments/${commentId}`)
    .set('Authorization', authHeader(friend))
    .expect(204);

  const getResponse = await request(app)
    .get(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(owner))
    .expect(200);

  assert.equal(getResponse.body.length, 0);
});

test('strangers cannot comment on a story (404)', async () => {
  const owner = await buildUser();
  const stranger = await buildUser();
  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  await request(app)
    .post(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(stranger))
    .send({ content: 'Hello!' })
    .expect(404);
});

test('requests without auth token are rejected', async () => {
  await request(app).get('/api/stories/me').expect(401);
});
