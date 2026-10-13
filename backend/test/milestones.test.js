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
  MILESTONE_VISIBLE_HOURS,
  MilestoneLike,
  MilestonePost,
} from '../src/features/milestones/milestone.model.js';
import { createMilestonePostForHabit } from '../src/features/milestones/milestone.service.js';
import { Notification } from '../src/features/notifications/notification.model.js';
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
    Notification.deleteMany({}),
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
  const companion = await Companion.create({ user: author._id, name: 'Luna', type: 'bear' });
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
  const scar = await Item.create({
    name: 'Scar',
    type: 'accessory',
    price: 120,
    assetKey: 'scar',
  });
  const sakuraOutfit = await Item.create({
    name: 'Sakura Outfit',
    type: 'clothing',
    price: 500,
    assetKey: 'sakura-outfit',
  });

  await UserItem.create([
    {
      user: author._id,
      item: hoodie._id,
      equipped: true,
      customization: {
        color: '#4F772D',
        stringColor: '#F8FAFC',
        textColor: '#111827',
        text: 'LUNA',
      },
    },
    { user: author._id, item: glasses._id, equipped: true },
    {
      user: author._id,
      item: cup._id,
      equipped: true,
      customization: {
        color: '#E09AAB',
        symbol: 'heart',
        symbolColor: '#3B82F6',
        side: 'right',
      },
    },
    {
      user: author._id,
      item: scar._id,
      equipped: true,
      customization: {
        color: '#7F1D1D',
      },
    },
    {
      user: author._id,
      item: sakuraOutfit._id,
      equipped: true,
      customization: {
        color: '#FCE8EC',
        cordColor: '#A16207',
        flowerSet1Color: '#F472B6',
        flowerSet2Color: '#DBEAFE',
        symbol: 'flower',
      },
    },
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
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(friend))
    .expect(200);

  assert.equal(feedResponse.body.length, 1);
  assert.equal(feedResponse.body[0].id, milestonePost._id.toString());
  assert.equal(feedResponse.body[0].habit.title, 'Chess');
  assert.equal(feedResponse.body[0].habit.frequency, 'Daily');
  assert.equal(feedResponse.body[0].habit.icon, '🎯');
  assert.equal(feedResponse.body[0].companion.id, companion._id.toString());
  assert.equal(feedResponse.body[0].companion.name, 'Luna');
  assert.equal(feedResponse.body[0].companion.type, 'bear');
  assert.deepEqual(feedResponse.body[0].companion.equippedItemKeys.sort(), ['cup', 'glasses', 'hoodie', 'sakura-outfit', 'scar']);
  assert.deepEqual(
    feedResponse.body[0].companion.equippedItemConfigs.find((item) => item.assetKey === 'hoodie'),
    {
      assetKey: 'hoodie',
      customization: {
        color: '#4F772D',
        stringColor: '#F8FAFC',
        textColor: '#111827',
        text: 'LUNA',
      },
    },
  );
  assert.deepEqual(
    feedResponse.body[0].companion.equippedItemConfigs.find((item) => item.assetKey === 'cup'),
    {
      assetKey: 'cup',
      customization: {
        color: '#E09AAB',
        symbol: 'heart',
        symbolColor: '#3B82F6',
        side: 'right',
      },
    },
  );
  assert.deepEqual(
    feedResponse.body[0].companion.equippedItemConfigs.find((item) => item.assetKey === 'scar'),
    {
      assetKey: 'scar',
      customization: {
        color: '#7F1D1D',
      },
    },
  );
  assert.deepEqual(
    feedResponse.body[0].companion.equippedItemConfigs.find((item) => item.assetKey === 'sakura-outfit'),
    {
      assetKey: 'sakura-outfit',
      customization: {
        color: '#FCE8EC',
        cordColor: '#A16207',
        flowerSet1Color: '#F472B6',
        flowerSet2Color: '#DBEAFE',
        symbol: 'flower',
      },
    },
  );
  assert.equal(feedResponse.body[0].likedByCurrentUser, false);
  assert.equal(feedResponse.body[0].currentUserReaction, null);
  assert.deepEqual(feedResponse.body[0].reactionCounts, []);
  assert.deepEqual(feedResponse.body[0].reactions, []);

  // First reaction adds the selected emoji
  const firstReactionResponse = await request(app)
    .post(`/api/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(friend))
    .send({ emoji: '🎉' })
    .expect(200);

  assert.equal(firstReactionResponse.body.liked, true);
  assert.equal(firstReactionResponse.body.milestonePost.likeCount, 1);
  assert.equal(firstReactionResponse.body.milestonePost.likedByCurrentUser, true);
  assert.equal(firstReactionResponse.body.milestonePost.currentUserReaction, '🎉');
  assert.deepEqual(firstReactionResponse.body.milestonePost.currentUserReactions, ['🎉']);
  assert.deepEqual(firstReactionResponse.body.milestonePost.reactionCounts, [{ emoji: '🎉', count: 1 }]);
  assert.equal(firstReactionResponse.body.milestonePost.reactions.length, 1);
  assert.equal(firstReactionResponse.body.milestonePost.reactions[0].emoji, '🎉');
  assert.equal(firstReactionResponse.body.milestonePost.reactions[0].user.id, friend._id.toString());
  assert.equal(firstReactionResponse.body.milestonePost.reactions[0].user.username, 'friend');
  assert.equal(firstReactionResponse.body.milestonePost.reactions[0].user.email, undefined);
  assert.equal(firstReactionResponse.body.milestonePost.habit.frequency, 'Daily');
  assert.equal(firstReactionResponse.body.milestonePost.habit.icon, '🎯');
  assert.equal(firstReactionResponse.body.milestonePost.companion.name, 'Luna');
  assert.equal(firstReactionResponse.body.milestonePost.companion.type, 'bear');
  assert.deepEqual(firstReactionResponse.body.milestonePost.companion.equippedItemKeys.sort(), ['cup', 'glasses', 'hoodie', 'sakura-outfit', 'scar']);
  assert.equal(
    firstReactionResponse.body.milestonePost.companion.equippedItemConfigs.find((item) => item.assetKey === 'hoodie').customization.text,
    'LUNA',
  );
  assert.equal(
    firstReactionResponse.body.milestonePost.companion.equippedItemConfigs.find((item) => item.assetKey === 'cup').customization.symbolColor,
    '#3B82F6',
  );
  assert.equal(
    await Notification.countDocuments({
      recipient: author._id,
      actor: friend._id,
      type: 'milestone_reacted',
      entityId: milestonePost._id,
      'metadata.emoji': '🎉',
    }),
    1,
  );

  // Choosing another emoji changes the user's single reaction
  const changedReactionResponse = await request(app)
    .post(`/api/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(friend))
    .send({ emoji: '🔥' })
    .expect(200);

  assert.equal(changedReactionResponse.body.liked, true);
  assert.equal(changedReactionResponse.body.milestonePost.likeCount, 1);
  assert.equal(changedReactionResponse.body.milestonePost.currentUserReaction, '🔥');
  assert.deepEqual(changedReactionResponse.body.milestonePost.currentUserReactions, ['🔥']);
  assert.deepEqual(changedReactionResponse.body.milestonePost.reactionCounts, [{ emoji: '🔥', count: 1 }]);
  assert.equal(changedReactionResponse.body.milestonePost.reactions[0].emoji, '🔥');
  assert.equal(await MilestoneLike.countDocuments({ milestonePost: milestonePost._id, user: friend._id }), 1);
  assert.equal(
    await Notification.countDocuments({
      recipient: author._id,
      actor: friend._id,
      type: 'milestone_reacted',
      entityId: milestonePost._id,
      'metadata.emoji': '🎉',
    }),
    0,
  );
  assert.equal(
    await Notification.countDocuments({
      recipient: author._id,
      actor: friend._id,
      type: 'milestone_reacted',
      entityId: milestonePost._id,
      'metadata.emoji': '🔥',
    }),
    1,
  );

  // Clicking the same emoji again removes the reaction
  const removedReactionResponse = await request(app)
    .post(`/api/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(friend))
    .send({ emoji: '🔥' })
    .expect(200);

  assert.equal(removedReactionResponse.body.liked, false);
  assert.equal(removedReactionResponse.body.milestonePost.likeCount, 0);
  assert.equal(removedReactionResponse.body.milestonePost.currentUserReaction, null);
  assert.deepEqual(removedReactionResponse.body.milestonePost.currentUserReactions, []);
  assert.deepEqual(removedReactionResponse.body.milestonePost.reactionCounts, []);
  assert.deepEqual(removedReactionResponse.body.milestonePost.reactions, []);
  assert.equal(removedReactionResponse.body.milestonePost.habit.frequency, 'Daily');
  assert.equal(removedReactionResponse.body.milestonePost.habit.icon, '🎯');
  assert.equal(removedReactionResponse.body.milestonePost.companion.name, 'Luna');
  assert.deepEqual(removedReactionResponse.body.milestonePost.companion.equippedItemKeys.sort(), ['cup', 'glasses', 'hoodie', 'sakura-outfit', 'scar']);
  assert.equal(
    await Notification.countDocuments({
      recipient: author._id,
      actor: friend._id,
      type: 'milestone_reacted',
      entityId: milestonePost._id,
    }),
    0,
  );
});

test('milestone reaction updates make read notifications unread again', async () => {
  const author = await buildUser({ username: 'reaction_notify_author', email: 'reaction-notify-author@example.com' });
  const friend = await buildUser({ username: 'reaction_notify_friend', email: 'reaction-notify-friend@example.com' });
  const premiumFriend = await buildUser({
    username: 'reaction_notify_premium',
    email: 'reaction-notify-premium@example.com',
    isPremium: true,
  });
  const habit = await buildHabit(author, { title: 'Reading', streakCount: 10 });

  await Friendship.create([
    { userA: author._id, userB: friend._id },
    { userA: author._id, userB: premiumFriend._id },
  ]);

  const freeMilestonePost = await MilestonePost.create({
    user: author._id,
    habit: habit._id,
    habitTitle: habit.title,
    streakDays: habit.streakCount,
  });

  await request(app)
    .post(`/api/milestones/${freeMilestonePost._id}/like`)
    .set('Authorization', authHeader(friend))
    .send({ emoji: '🎉' })
    .expect(200);

  const firstNotification = await Notification.findOne({
    recipient: author._id,
    actor: friend._id,
    type: 'milestone_reacted',
    entityId: freeMilestonePost._id,
  });

  assert.ok(firstNotification);
  firstNotification.readAt = new Date();
  await firstNotification.save();

  await request(app)
    .post(`/api/milestones/${freeMilestonePost._id}/like`)
    .set('Authorization', authHeader(friend))
    .send({ emoji: '🔥' })
    .expect(200);

  const changedReactionNotification = await Notification.findOne({
    recipient: author._id,
    actor: friend._id,
    type: 'milestone_reacted',
    entityId: freeMilestonePost._id,
  }).lean();

  assert.equal(
    await Notification.countDocuments({
      recipient: author._id,
      actor: friend._id,
      type: 'milestone_reacted',
      entityId: freeMilestonePost._id,
    }),
    1,
  );
  assert.equal(changedReactionNotification.readAt, null);
  assert.equal(changedReactionNotification.metadata.emoji, '🔥');
  assert.deepEqual(changedReactionNotification.metadata.emojis, ['🔥']);

  const unreadAfterChangedReaction = await request(app)
    .get('/api/notifications/unread-count')
    .set('Authorization', authHeader(author))
    .expect(200);

  assert.equal(unreadAfterChangedReaction.body.unreadCount, 1);

  // Each habit/streak pair has one milestone; use a separate habit for this case.
  const premiumHabit = await buildHabit(author, { title: 'Walking', streakCount: 10 });
  const premiumMilestonePost = await MilestonePost.create({
    user: author._id,
    habit: premiumHabit._id,
    habitTitle: premiumHabit.title,
    streakDays: premiumHabit.streakCount,
  });

  await request(app)
    .post(`/api/milestones/${premiumMilestonePost._id}/like`)
    .set('Authorization', authHeader(premiumFriend))
    .send({ emoji: '🎉' })
    .expect(200);

  const premiumNotification = await Notification.findOne({
    recipient: author._id,
    actor: premiumFriend._id,
    type: 'milestone_reacted',
    entityId: premiumMilestonePost._id,
  });

  assert.ok(premiumNotification);
  premiumNotification.readAt = new Date();
  await premiumNotification.save();

  await request(app)
    .post(`/api/milestones/${premiumMilestonePost._id}/like`)
    .set('Authorization', authHeader(premiumFriend))
    .send({ emoji: '🔥' })
    .expect(200);

  const addedReactionNotification = await Notification.findOne({
    recipient: author._id,
    actor: premiumFriend._id,
    type: 'milestone_reacted',
    entityId: premiumMilestonePost._id,
  }).lean();

  assert.equal(
    await Notification.countDocuments({
      recipient: author._id,
      actor: premiumFriend._id,
      type: 'milestone_reacted',
      entityId: premiumMilestonePost._id,
    }),
    1,
  );
  assert.equal(addedReactionNotification.readAt, null);
  assert.equal(addedReactionNotification.metadata.emoji, '🔥');
  assert.deepEqual(addedReactionNotification.metadata.emojis, ['🎉', '🔥']);

  const unreadAfterAddedReaction = await request(app)
    .get('/api/notifications/unread-count')
    .set('Authorization', authHeader(author))
    .expect(200);

  assert.equal(unreadAfterAddedReaction.body.unreadCount, 2);
});

test('milestone feed preserves equipped text-customizable items with no text', async () => {
  const author = await buildUser({ username: 'blank_text_author', email: 'blank-text-author@example.com' });
  const friend = await buildUser({ username: 'blank_text_friend', email: 'blank-text-friend@example.com' });
  const companion = await Companion.create({ user: author._id, name: 'Luna', type: 'bear' });
  const habit = await buildHabit(author, { title: 'Reading', streakCount: 10 });
  const hoodie = await Item.create({
    name: 'Hoodie',
    type: 'clothing',
    price: 500,
    assetKey: 'hoodie',
  });

  await UserItem.create({
    user: author._id,
    item: hoodie._id,
    equipped: true,
    customization: {
      color: '#4F772D',
      stringColor: '#F8FAFC',
      textColor: '#111827',
      text: '',
    },
  });

  await Friendship.create({
    userA: author._id,
    userB: friend._id,
  });

  await MilestonePost.create({
    user: author._id,
    habit: habit._id,
    habitTitle: habit.title,
    streakDays: habit.streakCount,
  });

  const feedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(friend))
    .expect(200);

  const hoodieConfig = feedResponse.body[0].companion.equippedItemConfigs.find(
    (item) => item.assetKey === 'hoodie',
  );

  assert.equal(feedResponse.body[0].companion.id, companion._id.toString());
  assert.deepEqual(hoodieConfig, {
    assetKey: 'hoodie',
    customization: {
      color: '#4F772D',
      stringColor: '#F8FAFC',
      textColor: '#111827',
      text: '',
    },
  });
});

// Tests that picker emojis outside the preset list are accepted, while text is rejected
test('milestone reactions accept custom picker emojis and reject non-emojis', async () => {
  const author = await buildUser({ username: 'custom_emoji_author', email: 'custom-emoji-author@example.com' });
  const friend = await buildUser({ username: 'custom_emoji_friend', email: 'custom-emoji-friend@example.com' });
  const habit = await buildHabit(author, { title: 'Reading', streakCount: 10 });

  await Friendship.create({ userA: author._id, userB: friend._id });
  const milestonePost = await MilestonePost.create({
    user: author._id,
    habit: habit._id,
    habitTitle: habit.title,
    streakDays: habit.streakCount,
  });

  const customReactionResponse = await request(app)
    .post(`/api/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(friend))
    .send({ emoji: '😂' })
    .expect(200);

  assert.equal(customReactionResponse.body.liked, true);
  assert.equal(customReactionResponse.body.milestonePost.currentUserReaction, '😂');
  assert.deepEqual(customReactionResponse.body.milestonePost.reactionCounts, [{ emoji: '😂', count: 1 }]);

  const invalidReactionResponse = await request(app)
    .post(`/api/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(friend))
    .send({ emoji: 'not an emoji' })
    .expect(400);

  assert.equal(invalidReactionResponse.body.code, 'MILESTONE_REACTION_INVALID');
});

// Tests that premium users can add up to 5 reactions to the same milestone
test('premium users can react with up to five emojis on one milestone', async () => {
  const author = await buildUser({ username: 'premium_reaction_author', email: 'premium-reaction-author@example.com' });
  const premiumFriend = await buildUser({
    username: 'premium_reaction_friend',
    email: 'premium-reaction-friend@example.com',
    isPremium: true,
  });
  const habit = await buildHabit(author, { title: 'Reading', streakCount: 10 });

  await Friendship.create({ userA: author._id, userB: premiumFriend._id });
  const milestonePost = await MilestonePost.create({
    user: author._id,
    habit: habit._id,
    habitTitle: habit.title,
    streakDays: habit.streakCount,
  });
  let reactionResponse;

  for (const emoji of ['🎉', '🔥', '👏', '💜', '✨']) {
    reactionResponse = await request(app)
      .post(`/api/milestones/${milestonePost._id}/like`)
      .set('Authorization', authHeader(premiumFriend))
      .send({ emoji })
      .expect(200);
  }

  const storedReactions = await MilestoneLike.find({
    milestonePost: milestonePost._id,
    user: premiumFriend._id,
  }).sort({ createdAt: 1 });

  assert.deepEqual(storedReactions.map((reaction) => reaction.emoji), ['🎉', '🔥', '👏', '💜', '✨']);
  assert.deepEqual(
    reactionResponse.body.milestonePost.reactionCounts.map((reaction) => reaction.emoji),
    ['🎉', '🔥', '👏', '💜', '✨'],
  );
  assert.equal(
    await Notification.countDocuments({
      recipient: author._id,
      actor: premiumFriend._id,
      type: 'milestone_reacted',
      entityId: milestonePost._id,
    }),
    1,
  );

  const reactionNotification = await Notification.findOne({
    recipient: author._id,
    actor: premiumFriend._id,
    type: 'milestone_reacted',
    entityId: milestonePost._id,
  }).lean();

  assert.deepEqual(reactionNotification.metadata.emojis, ['🎉', '🔥', '👏', '💜', '✨']);
  assert.equal(reactionNotification.metadata.emoji, '✨');

  const limitResponse = await request(app)
    .post(`/api/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(premiumFriend))
    .send({ emoji: '😂' })
    .expect(400);

  assert.equal(limitResponse.body.code, 'MILESTONE_REACTION_LIMIT_REACHED');
});

// Tests that many users can react to the same post without mixing up counts or selected reactions
test('milestone reactions aggregate correctly across multiple users', async () => {
  const author = await buildUser({ username: 'multi_reaction_author', email: 'multi-reaction-author@example.com' });
  const premiumFriend = await buildUser({
    username: 'multi_reaction_premium',
    email: 'multi-reaction-premium@example.com',
    isPremium: true,
  });
  const freeFriend = await buildUser({ username: 'multi_reaction_free', email: 'multi-reaction-free@example.com' });
  const anotherFriend = await buildUser({ username: 'multi_reaction_other', email: 'multi-reaction-other@example.com' });
  const habit = await buildHabit(author, { title: 'Reading', streakCount: 10 });

  await Friendship.create([
    { userA: author._id, userB: premiumFriend._id },
    { userA: author._id, userB: freeFriend._id },
    { userA: author._id, userB: anotherFriend._id },
  ]);

  const milestonePost = await MilestonePost.create({
    user: author._id,
    habit: habit._id,
    habitTitle: habit.title,
    streakDays: habit.streakCount,
  });

  await request(app)
    .post(`/api/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(premiumFriend))
    .send({ emoji: '💜' })
    .expect(200);
  await request(app)
    .post(`/api/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(premiumFriend))
    .send({ emoji: '🎉' })
    .expect(200);
  await request(app)
    .post(`/api/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(freeFriend))
    .send({ emoji: '💜' })
    .expect(200);
  await request(app)
    .post(`/api/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(anotherFriend))
    .send({ emoji: '😂' })
    .expect(200);
  await request(app)
    .post(`/api/milestones/${milestonePost._id}/like`)
    .set('Authorization', authHeader(freeFriend))
    .send({ emoji: '🎉' })
    .expect(200);

  const premiumFeedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(premiumFriend))
    .expect(200);
  const premiumFeedPost = premiumFeedResponse.body.find((post) => post.id === milestonePost._id.toString());

  assert.ok(premiumFeedPost);
  assert.equal(premiumFeedPost.likeCount, 4);
  assert.deepEqual(premiumFeedPost.currentUserReactions, ['💜', '🎉']);
  assert.deepEqual(premiumFeedPost.reactionCounts, [
    { emoji: '💜', count: 1 },
    { emoji: '🎉', count: 2 },
    { emoji: '😂', count: 1 },
  ]);
  assert.equal(premiumFeedPost.reactions.length, 4);

  const freeFeedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(freeFriend))
    .expect(200);
  const freeFeedPost = freeFeedResponse.body.find((post) => post.id === milestonePost._id.toString());

  assert.ok(freeFeedPost);
  assert.deepEqual(freeFeedPost.currentUserReactions, ['🎉']);
  assert.equal(await MilestoneLike.countDocuments({ milestonePost: milestonePost._id, user: freeFriend._id }), 1);
});

test('milestone reactions support limit and offset pagination', async () => {
  const author = await buildUser({ username: 'reaction_page_author', email: 'reaction-page-author@example.com' });
  const habit = await buildHabit(author, { title: 'Paged reactions' });
  const milestonePost = await MilestonePost.create({
    user: author._id,
    habit: habit._id,
    habitTitle: habit.title,
    streakDays: 10,
    visibleUntil: new Date(Date.now() + MILESTONE_VISIBLE_HOURS * 60 * 60 * 1000),
    likeCount: 12,
  });
  const reactors = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      buildUser({
        username: `reaction_page_user_${index}`,
        email: `reaction-page-user-${index}@example.com`,
      })
    )
  );

  await MilestoneLike.insertMany(
    reactors.map((reactor, index) => ({
      milestonePost: milestonePost._id,
      user: reactor._id,
      emoji: index % 2 === 0 ? '💜' : '🔥',
      createdAt: new Date(Date.now() + index),
      updatedAt: new Date(Date.now() + index),
    }))
  );

  const firstPage = await request(app)
    .get(`/api/milestones/${milestonePost._id}/reactions?limit=10&offset=0`)
    .set('Authorization', authHeader(author))
    .expect(200);

  assert.equal(firstPage.body.items.length, 10);
  assert.equal(firstPage.body.hasMore, true);
  assert.equal(firstPage.body.nextOffset, 10);

  const secondPage = await request(app)
    .get(`/api/milestones/${milestonePost._id}/reactions?limit=10&offset=10`)
    .set('Authorization', authHeader(author))
    .expect(200);

  assert.equal(secondPage.body.items.length, 2);
  assert.equal(secondPage.body.hasMore, false);
  assert.equal(secondPage.body.nextOffset, 12);
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

// Tests that reusing an old milestone refreshes its 7-day feed visibility
test('milestone creation refreshes visibility for an existing milestone post', async () => {
  const viewer = await buildUser({ username: 'refresh_viewer', email: 'refresh-viewer@example.com' });
  const author = await buildUser({ username: 'refresh_author', email: 'refresh-author@example.com' });
  const habit = await buildHabit(author, { title: 'Reading', streakCount: 10 });
  const expiredMilestonePost = await MilestonePost.create({
    user: author._id,
    habit: habit._id,
    habitTitle: habit.title,
    streakDays: habit.streakCount,
    visibleUntil: new Date(Date.now() - 60 * 1000),
  });

  await Friendship.create({ userA: viewer._id, userB: author._id });

  const refreshedResult = await createMilestonePostForHabit(habit);

  assert.equal(refreshedResult.milestonePost._id.toString(), expiredMilestonePost._id.toString());
  assert.ok(refreshedResult.milestonePost.visibleUntil > new Date());
  assert.ok(
    refreshedResult.milestonePost.visibleUntil.getTime() - Date.now()
      >= (MILESTONE_VISIBLE_HOURS - 1) * 60 * 60 * 1000,
  );

  const feedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(viewer))
    .expect(200);

  assert.equal(feedResponse.body.length, 1);
  assert.equal(feedResponse.body[0].id, expiredMilestonePost._id.toString());
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
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(currentUser))
    .expect(200);

  const feedPostIds = feedResponse.body.map((post) => post.id);

  assert.equal(feedResponse.body.length, 2);
  assert.ok(feedPostIds.includes(visibleFriendPost._id.toString()));
  assert.ok(feedPostIds.includes(ownPost._id.toString()));
  assert.ok(feedResponse.body.every((post) => post.visibleUntil));
});

// Tests that a ghost-mode friend's milestones are hidden while own and normal-friend posts remain
test('social feed hides milestones from ghost-mode friends', async () => {
  const currentUser = await buildUser({ username: 'ghost_feed_viewer', email: 'ghost-feed-viewer@example.com' });
  const ghostFriend = await buildUser({ username: 'ghost_feed_friend', email: 'ghost-feed-friend@example.com', ghostMode: true });
  const normalFriend = await buildUser({ username: 'normal_feed_friend', email: 'normal-feed-friend@example.com' });
  const ghostHabit = await buildHabit(ghostFriend, { title: 'Ghost habit', streakCount: 10 });
  const normalHabit = await buildHabit(normalFriend, { title: 'Normal habit', streakCount: 10 });
  const ownHabit = await buildHabit(currentUser, { title: 'Own habit', streakCount: 10 });

  await Friendship.create([
    { userA: currentUser._id, userB: ghostFriend._id },
    { userA: currentUser._id, userB: normalFriend._id },
  ]);

  const ghostPost = await MilestonePost.create({
    user: ghostFriend._id,
    habit: ghostHabit._id,
    habitTitle: ghostHabit.title,
    streakDays: 10,
  });
  const normalPost = await MilestonePost.create({
    user: normalFriend._id,
    habit: normalHabit._id,
    habitTitle: normalHabit.title,
    streakDays: 10,
  });
  const ownPost = await MilestonePost.create({
    user: currentUser._id,
    habit: ownHabit._id,
    habitTitle: ownHabit.title,
    streakDays: 10,
  });

  const feedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(currentUser))
    .expect(200);

  const feedPostIds = feedResponse.body.map((post) => post.id);

  assert.equal(feedResponse.body.length, 2);
  assert.ok(feedPostIds.includes(normalPost._id.toString()));
  assert.ok(feedPostIds.includes(ownPost._id.toString()));
  assert.ok(!feedPostIds.includes(ghostPost._id.toString()));
});

// Tests that a ghost-mode user still sees their own milestones in their feed
test('a ghost-mode user still sees their own milestones', async () => {
  const ghostUser = await buildUser({ username: 'self_ghost_viewer', email: 'self-ghost-viewer@example.com', ghostMode: true });
  const ownHabit = await buildHabit(ghostUser, { title: 'Own habit', streakCount: 10 });
  const ownPost = await MilestonePost.create({
    user: ghostUser._id,
    habit: ownHabit._id,
    habitTitle: ownHabit.title,
    streakDays: 10,
  });

  const feedResponse = await request(app)
    .get('/api/milestones/feed')
    .set('Authorization', authHeader(ghostUser))
    .expect(200);

  assert.equal(feedResponse.body.length, 1);
  assert.equal(feedResponse.body[0].id, ownPost._id.toString());
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
    .get('/api/milestones/feed')
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
    .post(`/api/milestones/${ownPost._id}/like`)
    .set('Authorization', authHeader(currentUser))
    .send({ emoji: '💜' })
    .expect(200);

  assert.equal(ownLikeResponse.body.liked, true);
  assert.equal(ownLikeResponse.body.milestonePost.likeCount, 1);
  assert.equal(ownLikeResponse.body.milestonePost.likedByCurrentUser, true);
  assert.equal(ownLikeResponse.body.milestonePost.currentUserReaction, '💜');

  const strangerLikeResponse = await request(app)
    .post(`/api/milestones/${strangerPost._id}/like`)
    .set('Authorization', authHeader(currentUser))
    .send({ emoji: '💜' })
    .expect(400);

  assert.equal(strangerLikeResponse.body.code, 'MILESTONE_POST_NOT_FOUND');
});
