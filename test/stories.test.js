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
import { Notification } from '../src/features/notifications/notification.model.js';
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
    Notification.deleteMany({}),
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
  assert.equal(
    await Notification.countDocuments({ recipient: owner._id, actor: friend._id, type: 'story_liked' }),
    1,
  );

  const unlikeResponse = await request(app)
    .post(`/api/stories/${story._id}/like`)
    .set('Authorization', authHeader(friend))
    .expect(200);

  assert.equal(unlikeResponse.body.liked, false);
  assert.equal(unlikeResponse.body.story.likeCount, 0);
  assert.equal(
    await Notification.countDocuments({ recipient: owner._id, actor: friend._id, type: 'story_liked' }),
    0,
  );
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

test('story comment count stays independent from like count', async () => {
  const owner = await buildUser();
  const friend = await buildUser();
  await makeFriends(owner, friend);

  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  await request(app)
    .post(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(friend))
    .send({ content: 'This should count only as a comment' })
    .expect(201);

  await request(app)
    .post(`/api/stories/${story._id}/like`)
    .set('Authorization', authHeader(friend))
    .expect(200);

  await request(app)
    .post(`/api/stories/${story._id}/like`)
    .set('Authorization', authHeader(friend))
    .expect(200);

  const updatedStory = await Story.findById(story._id).lean();
  assert.equal(updatedStory.likeCount, 0);
  assert.equal(updatedStory.commentCount, 1);

  const feedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(owner))
    .expect(200);

  const feedStory = feedResponse.body.find((post) => post.type === 'story');
  assert.equal(feedStory.likeCount, 0);
  assert.equal(feedStory.commentCount, 1);
});

test('tagging the story owner creates a tagged notification instead of a normal comment notification', async () => {
  const owner = await buildUser({ username: 'alice', firstName: 'Alice' });
  const commenter = await buildUser({ username: 'bob', firstName: 'Bob' });
  await makeFriends(owner, commenter);

  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  const commentResponse = await request(app)
    .post(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(commenter))
    .send({ content: 'Great post @alice' })
    .expect(201);

  const ownerNotifications = await Notification.find({ recipient: owner._id }).lean();

  assert.equal(ownerNotifications.length, 1);
  assert.equal(ownerNotifications[0].type, 'story_tagged');
  assert.equal(ownerNotifications[0].metadata.commentId.toString(), commentResponse.body.id);
  assert.equal(ownerNotifications[0].metadata.taggedOnOwnPost, true);
  assert.equal(await Notification.countDocuments({ recipient: owner._id, type: 'story_commented' }), 0);
});

test('tagging a friend on another friends story creates a tagged notification with the story owner name', async () => {
  const storyOwner = await buildUser({ username: 'charlie', firstName: 'Charlie' });
  const commenter = await buildUser({ username: 'bob', firstName: 'Bob' });
  const taggedFriend = await buildUser({ username: 'alice', firstName: 'Alice' });
  await makeFriends(storyOwner, commenter);
  await makeFriends(storyOwner, taggedFriend);

  const habit = await buildHabit(storyOwner);
  const story = await buildStory(storyOwner, habit);

  const commentResponse = await request(app)
    .post(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(commenter))
    .send({ content: 'You should see this @alice' })
    .expect(201);

  const taggedNotification = await Notification.findOne({
    recipient: taggedFriend._id,
    type: 'story_tagged',
  }).lean();

  assert.ok(taggedNotification);
  assert.equal(taggedNotification.actor.toString(), commenter._id.toString());
  assert.equal(taggedNotification.entityId.toString(), story._id.toString());
  assert.equal(taggedNotification.metadata.commentId.toString(), commentResponse.body.id);
  assert.equal(taggedNotification.metadata.storyOwnerName, 'Charlie');
});

test('tagging a user who cannot see the story does not create a notification', async () => {
  const storyOwner = await buildUser({ username: 'charlie', firstName: 'Charlie' });
  const commenter = await buildUser({ username: 'bob', firstName: 'Bob' });
  const taggedStranger = await buildUser({ username: 'alice', firstName: 'Alice' });
  await makeFriends(storyOwner, commenter);

  const habit = await buildHabit(storyOwner);
  const story = await buildStory(storyOwner, habit);

  await request(app)
    .post(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(commenter))
    .send({ content: 'This is private to friends @alice' })
    .expect(201);

  assert.equal(await Notification.countDocuments({ recipient: taggedStranger._id }), 0);
});

test('story mention candidates come from users who can see the story, not interactions', async () => {
  const storyOwner = await buildUser({ username: 'charlie', firstName: 'Charlie' });
  const commenter = await buildUser({ username: 'bob', firstName: 'Bob' });
  const visibleFriend = await buildUser({ username: 'alice', firstName: 'Alice' });
  const stranger = await buildUser({ username: 'zoe', firstName: 'Zoe' });
  await makeFriends(storyOwner, commenter);
  await makeFriends(storyOwner, visibleFriend);

  const habit = await buildHabit(storyOwner);
  const story = await buildStory(storyOwner, habit);

  await StoryLike.create({ story: story._id, user: stranger._id });
  await StoryComment.create({ story: story._id, user: stranger._id, content: 'I should not appear' });

  const response = await request(app)
    .get(`/api/stories/${story._id}/mention-candidates`)
    .set('Authorization', authHeader(commenter))
    .expect(200);

  const usernames = response.body.map((user) => user.username).sort();

  assert.deepEqual(usernames, ['alice', 'charlie']);
});

test('story mention candidates exclude blocked relationships', async () => {
  const storyOwner = await buildUser({ username: 'charlie', firstName: 'Charlie' });
  const commenter = await buildUser({ username: 'bob', firstName: 'Bob' });
  const blockedFriend = await buildUser({ username: 'alice', firstName: 'Alice' });
  await makeFriends(storyOwner, commenter);
  await makeFriends(storyOwner, blockedFriend);
  await User.updateOne(
    { _id: commenter._id },
    { $addToSet: { blockedUsers: blockedFriend._id } },
  );

  const habit = await buildHabit(storyOwner);
  const story = await buildStory(storyOwner, habit);

  const response = await request(app)
    .get(`/api/stories/${story._id}/mention-candidates`)
    .set('Authorization', authHeader(commenter))
    .expect(200);

  const usernames = response.body.map((user) => user.username).sort();

  assert.deepEqual(usernames, ['charlie']);
});

test('story mention candidates are unavailable to users who cannot see the story', async () => {
  const storyOwner = await buildUser({ username: 'charlie', firstName: 'Charlie' });
  const stranger = await buildUser({ username: 'zoe', firstName: 'Zoe' });
  const habit = await buildHabit(storyOwner);
  const story = await buildStory(storyOwner, habit);

  await request(app)
    .get(`/api/stories/${story._id}/mention-candidates`)
    .set('Authorization', authHeader(stranger))
    .expect(404);
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
  assert.equal(await Notification.countDocuments({ entityType: 'story', entityId: story._id }), 1);

  await request(app)
    .delete(`/api/stories/${story._id}`)
    .set('Authorization', authHeader(owner))
    .expect(204);

  assert.equal(await Story.countDocuments({}), 0);
  assert.equal(await StoryLike.countDocuments({}), 0);
  assert.equal(await Notification.countDocuments({ entityType: 'story', entityId: story._id }), 0);
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

test('parallel comments keep story commentCount accurate', async () => {
  const owner = await buildUser();
  const firstFriend = await buildUser();
  const secondFriend = await buildUser();
  await makeFriends(owner, firstFriend);
  await makeFriends(owner, secondFriend);

  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  await Promise.all([
    request(app)
      .post(`/api/stories/${story._id}/comments`)
      .set('Authorization', authHeader(owner))
      .send({ content: 'Owner comment' })
      .expect(201),
    request(app)
      .post(`/api/stories/${story._id}/comments`)
      .set('Authorization', authHeader(firstFriend))
      .send({ content: 'First friend comment' })
      .expect(201),
    request(app)
      .post(`/api/stories/${story._id}/comments`)
      .set('Authorization', authHeader(secondFriend))
      .send({ content: 'Second friend comment' })
      .expect(201),
  ]);

  const updatedStory = await Story.findById(story._id).lean();
  assert.equal(updatedStory.commentCount, 3);

  const getResponse = await request(app)
    .get(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(owner))
    .expect(200);

  assert.equal(getResponse.body.length, 3);
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
  assert.equal(
    await Notification.countDocuments({
      recipient: owner._id,
      actor: friend._id,
      type: 'story_commented',
      entityId: story._id,
    }),
    1,
  );

  const stranger = await buildUser();

  // another user (stranger) cannot delete friend's comment
  await request(app)
    .delete(`/api/stories/${story._id}/comments/${commentId}`)
    .set('Authorization', authHeader(stranger))
    .expect(404);

  // story owner can delete friend's comment
  await request(app)
    .delete(`/api/stories/${story._id}/comments/${commentId}`)
    .set('Authorization', authHeader(owner))
    .expect(204);

  const getResponse = await request(app)
    .get(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(owner))
    .expect(200);

  assert.equal(getResponse.body.length, 0);
  assert.equal(
    await Notification.countDocuments({
      recipient: owner._id,
      actor: friend._id,
      type: 'story_commented',
      entityId: story._id,
    }),
    0,
  );
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

test('a user can reply to a comment, and deleting the parent comment deletes replies and updates story commentCount', async () => {
  const owner = await buildUser();
  const friend = await buildUser();
  await makeFriends(owner, friend);

  const habit = await buildHabit(owner);
  const story = await buildStory(owner, habit);

  // 1. Post parent comment
  const parentRes = await request(app)
    .post(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(owner))
    .send({ content: 'Main thread comment' })
    .expect(201);

  const parentId = parentRes.body.id;

  // 2. Post reply comment
  const replyRes = await request(app)
    .post(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(friend))
    .send({ content: 'My reply to you', parentCommentId: parentId })
    .expect(201);

  assert.equal(replyRes.body.parentComment, parentId);
  assert.equal(await Notification.countDocuments({ entityType: 'story', entityId: story._id }), 1);

  // Check comment count on story document
  const updatedStory = await Story.findById(story._id);
  assert.equal(updatedStory.commentCount, 2);

  // Fetch comments to verify listing both
  const getRes = await request(app)
    .get(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(owner))
    .expect(200);

  assert.equal(getRes.body.length, 2);
  assert.equal(getRes.body[0].id, parentId);
  assert.equal(getRes.body[1].parentComment, parentId);

  // 3. Delete parent comment (which deletes reply too)
  await request(app)
    .delete(`/api/stories/${story._id}/comments/${parentId}`)
    .set('Authorization', authHeader(owner))
    .expect(204);

  // Check if comments list is empty
  const getResAfterDelete = await request(app)
    .get(`/api/stories/${story._id}/comments`)
    .set('Authorization', authHeader(owner))
    .expect(200);

  assert.equal(getResAfterDelete.body.length, 0);

  // Check if story commentCount is decremented by 2 (back to 0)
  const finalStory = await Story.findById(story._id);
  assert.equal(finalStory.commentCount, 0);
  assert.equal(await Notification.countDocuments({ entityType: 'story', entityId: story._id }), 0);
});

test('requests without auth token are rejected', async () => {
  await request(app).get('/api/stories/me').expect(401);
});
