import mongoose from 'mongoose';
import { toPublicUser } from '../users/user.service.js';
import User from '../users/user.model.js';
import { Friendship } from '../social/social.model.js';
import { getBlockedUserIds } from '../social/social.service.js';
import Companion from '../companion/companion.model.js';
import UserItem from '../inventory/inventory.model.js';
import { hasPremiumAccess } from '../../config/plans.js';
import config from '../../../config.js';
import {
  MilestoneLike,
  MilestonePost,
  MILESTONE_INTERVAL_DAYS,
  MILESTONE_VISIBLE_HOURS,
} from './milestone.model.js';

const SERVER_BASE_URL = config.serverBaseUrl ?? 'http://localhost:3000';

const SINGLE_EMOJI_REACTION_PATTERN = /^(?:\p{Regional_Indicator}{2}|(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\p{Emoji_Modifier})?(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\p{Emoji_Modifier})?)*)$/u;
const FREE_REACTION_LIMIT = 1;
const PREMIUM_REACTION_LIMIT = 5;
let legacyReactionIndexDropPromise = null;

function sameId(firstId, secondId) {
  return firstId?.toString() === secondId?.toString();
}

function buildFriendshipPair(firstUserId, secondUserId) {
  const [userA, userB] = [firstUserId.toString(), secondUserId.toString()].sort();
  return { userA, userB };
}

function isValidReactionEmoji(emoji) {
  return typeof emoji === 'string' && SINGLE_EMOJI_REACTION_PATTERN.test(emoji.trim());
}

function normalizeReactionList(reactions) {
  if (!reactions) {
    return [];
  }

  return Array.isArray(reactions) ? reactions : [reactions];
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

async function dropLegacyReactionUniqueIndex() {
  if (!legacyReactionIndexDropPromise) {
    legacyReactionIndexDropPromise = (async () => {
      const indexes = await MilestoneLike.collection.indexes();
      const legacyIndex = indexes.find((index) =>
        index.unique
        && index.key?.milestonePost === 1
        && index.key?.user === 1
        && index.key?.emoji === undefined
      );

      if (!legacyIndex) {
        return false;
      }

      await MilestoneLike.collection.dropIndex(legacyIndex.name);
      await MilestoneLike.collection.createIndex(
        { milestonePost: 1, user: 1, emoji: 1 },
        { unique: true }
      );

      return true;
    })();
  }

  return legacyReactionIndexDropPromise;
}

async function createMilestoneReaction({ milestonePostId, userId, emoji }) {
  try {
    return await MilestoneLike.create({
      milestonePost: milestonePostId,
      user: userId,
      emoji,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const droppedLegacyIndex = await dropLegacyReactionUniqueIndex();

    if (!droppedLegacyIndex) {
      throw error;
    }

    return MilestoneLike.create({
      milestonePost: milestonePostId,
      user: userId,
      emoji,
    });
  }
}

function toCompanionResponse(companion, equippedItemConfigs = []) {
  // Fallback for users who do not have a companion document yet
  return {
    id: companion?._id?.toString?.() ?? null,
    name: companion?.name ?? 'Howly',
    type: companion?.type ?? 'wolf',
    equippedItemKeys: equippedItemConfigs.map((item) => item.assetKey).filter(Boolean),
    equippedItemConfigs,
  };
}

function toReactionUserResponse(user) {
  if (!user) {
    return null;
  }

  const profilePictureUrl = user.profilePictureUrl
    ? user.profilePictureUrl
    : `${SERVER_BASE_URL}/uploads/profile-pictures/default.png`;

  return {
    id: user._id.toString(),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePictureUrl,
    streak: user.streak,
  };
}

function toMilestonePostResponse(
  post,
  userReactionsByPostId = new Map(),
  companionsByUserId = new Map(),
  equippedItemsByUserId = new Map(),
  reactionCountsByPostId = new Map(),
  reactionsByPostId = new Map()
) {
  const populatedHabit = post.habit && typeof post.habit === 'object' ? post.habit : null;
  const habitId = populatedHabit?._id?.toString?.() ?? post.habit?.toString?.() ?? post.habit;
  const userId = post.user?._id?.toString?.() ?? post.user?.toString?.() ?? post.user;
  const postId = post._id.toString();
  const currentUserReactions = normalizeReactionList(userReactionsByPostId.get(postId));
  const currentUserReaction = currentUserReactions[0] ?? null;

  return {
    id: postId,
    user: toPublicUser(post.user),
    companion: toCompanionResponse(
      companionsByUserId.get(userId),
      equippedItemsByUserId.get(userId) ?? []
    ),
    habit: {
      id: habitId,
      title: post.habitTitle,
      frequency: populatedHabit?.frequency ?? null,
      icon: populatedHabit?.icon ?? null,
    },
    streakDays: post.streakDays,
    visibleUntil: post.visibleUntil,
    likeCount: post.likeCount,
    likedByCurrentUser: currentUserReactions.length > 0,
    currentUserReaction,
    currentUserReactions,
    reactionCounts: reactionCountsByPostId.get(postId) ?? [],
    reactions: reactionsByPostId.get(postId) ?? [],
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

async function getReactionCountsByPostId(postIds, currentUserId = null) {
  if (!postIds.length) {
    return new Map();
  }

  const matchQuery = { milestonePost: { $in: postIds } };
  if (currentUserId) {
    const blockedSet = await getBlockedUserIds(currentUserId);
    if (blockedSet.size > 0) {
      matchQuery.user = { $nin: [...blockedSet].map((id) => new mongoose.Types.ObjectId(id)) };
    }
  }

  const groupedReactions = await MilestoneLike.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: { milestonePost: '$milestonePost', emoji: '$emoji' },
        count: { $sum: 1 },
        firstReactedAt: { $min: '$createdAt' },
      },
    },
    { $sort: { firstReactedAt: 1, count: -1, '_id.emoji': 1 } },
  ]);
  const reactionCountsByPostId = new Map();

  groupedReactions.forEach((reaction) => {
    const postId = reaction._id.milestonePost.toString();
    const counts = reactionCountsByPostId.get(postId) ?? [];
    counts.push({ emoji: reaction._id.emoji, count: reaction.count });
    reactionCountsByPostId.set(postId, counts);
  });

  return reactionCountsByPostId;
}

async function getReactionsByPostId(postIds, currentUserId = null) {
  if (!postIds.length) {
    return new Map();
  }

  const reactions = await MilestoneLike.find({ milestonePost: { $in: postIds } })
    .populate('user')
    .sort({ createdAt: -1 })
    .lean();
  const reactionsByPostId = new Map();

  let blockedSet = new Set();
  if (currentUserId) {
    blockedSet = await getBlockedUserIds(currentUserId);
  }

  reactions.forEach((reaction) => {
    const reactingUserId = reaction.user?._id?.toString() || reaction.user?.toString();
    if (blockedSet.has(reactingUserId)) {
      return;
    }
    const postId = reaction.milestonePost.toString();
    const postReactions = reactionsByPostId.get(postId) ?? [];

    postReactions.push({
      emoji: reaction.emoji,
      user: toReactionUserResponse(reaction.user),
      createdAt: reaction.createdAt,
    });
    reactionsByPostId.set(postId, postReactions);
  });

  return reactionsByPostId;
}

async function getEquippedItemsByUserId(userIds) {
  const uniqueUserIds = [...new Set(userIds.map((userId) => userId?.toString()).filter(Boolean))];

  if (!uniqueUserIds.length) {
    return new Map();
  }

  const userItems = await UserItem.find({
    user: { $in: uniqueUserIds },
    equipped: true,
  })
    .populate('item')
    .lean();
  const equippedItemsByUserId = new Map();

  userItems.forEach((userItem) => {
    const userId = userItem.user.toString();
    const assetKey = userItem.item?.assetKey;

    if (!assetKey) {
      return;
    }

    const equippedItems = equippedItemsByUserId.get(userId) ?? [];
    equippedItems.push({
      assetKey,
      customization: userItem.customization ?? {},
    });
    equippedItemsByUserId.set(userId, equippedItems);
  });

  return equippedItemsByUserId;
}

export async function enrichMilestonePost(post, currentUserReaction = null, currentUserId = null) {
  await post.populate(['user', 'habit']);

  const companion = await Companion.findOne({ user: post.user._id ?? post.user }).lean();
  const companionUserId = companion?.user?.toString();
  const companionsByUserId = companionUserId
    ? new Map([[companionUserId, companion]])
    : new Map();
  const equippedItemsByUserId = await getEquippedItemsByUserId([post.user._id ?? post.user]);
  const postId = post._id.toString();
  const currentUserReactions = normalizeReactionList(currentUserReaction);
  const userReactionsByPostId = currentUserReactions.length
    ? new Map([[postId, currentUserReactions]])
    : new Map();
  const reactionCountsByPostId = await getReactionCountsByPostId([post._id], currentUserId);
  const reactionsByPostId = await getReactionsByPostId([post._id], currentUserId);

  return toMilestonePostResponse(
    post,
    userReactionsByPostId,
    companionsByUserId,
    equippedItemsByUserId,
    reactionCountsByPostId,
    reactionsByPostId
  );
}

async function areFriends(firstUserId, secondUserId) {
  const pair = buildFriendshipPair(firstUserId, secondUserId);
  const friendship = await Friendship.findOne(pair).lean();

  return Boolean(friendship);
}

export async function createMilestonePostForHabit(habit) {
  if (
    !habit
    || habit.streakCount < MILESTONE_INTERVAL_DAYS
    || habit.streakCount % MILESTONE_INTERVAL_DAYS !== 0
  ) {
    return { milestonePost: null };
  }

  const visibleUntil = new Date(Date.now() + MILESTONE_VISIBLE_HOURS * 60 * 60 * 1000);

  const milestonePost = await MilestonePost.findOneAndUpdate(
    {
      habit: habit._id,
      streakDays: habit.streakCount,
    },
    {
      user: habit.ownerId,
      habit: habit._id,
      habitTitle: habit.title,
      streakDays: habit.streakCount,
      visibleUntil,
    },
    {
      returnDocument: 'after',
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  return { milestonePost };
}

export async function getFriendFeed({ userId }) {
  const friendships = await Friendship.find({
    $or: [{ userA: userId }, { userB: userId }],
  }).lean();

  const visibleUserIds = new Set([userId.toString()]);

  friendships.forEach((friendship) => {
    const friendId = sameId(friendship.userA, userId) ? friendship.userB : friendship.userA;
    visibleUserIds.add(friendId.toString());
  });

  const now = new Date();
  const posts = await MilestonePost.find({
    user: { $in: [...visibleUserIds] },
    visibleUntil: { $gt: now },
  })
    .populate('user')
    .populate('habit')
    .sort({ createdAt: -1 });

  const reactions = await MilestoneLike.find({
    user: userId,
    milestonePost: { $in: posts.map((post) => post._id) },
  })
    .sort({ createdAt: 1 })
    .lean();
  const userReactionsByPostId = new Map();

  reactions.forEach((reaction) => {
    const postId = reaction.milestonePost.toString();
    const postReactions = userReactionsByPostId.get(postId) ?? [];

    postReactions.push(reaction.emoji);
    userReactionsByPostId.set(postId, postReactions);
  });
  const reactionCountsByPostId = await getReactionCountsByPostId(posts.map((post) => post._id), userId);
  const reactionsByPostId = await getReactionsByPostId(posts.map((post) => post._id), userId);
  const companions = await Companion.find({
    user: { $in: posts.map((post) => post.user._id ?? post.user) },
  }).lean();
  const companionsByUserId = new Map(
    companions.map((companion) => [companion.user.toString(), companion])
  );
  const equippedItemsByUserId = await getEquippedItemsByUserId(
    posts.map((post) => post.user._id ?? post.user)
  );

  return posts.map((post) =>
    toMilestonePostResponse(
      post,
      userReactionsByPostId,
      companionsByUserId,
      equippedItemsByUserId,
      reactionCountsByPostId,
      reactionsByPostId
    )
  );
}

export async function toggleMilestoneLike({ userId, milestonePostId, emoji = '💜' }) {
  const reactionEmoji = typeof emoji === 'string' ? emoji.trim() : emoji;

  if (!isValidReactionEmoji(reactionEmoji)) {
    return { errorCode: 'MILESTONE_REACTION_INVALID' };
  }

  const [post, currentUser] = await Promise.all([
    MilestonePost.findById(milestonePostId),
    User.findById(userId).select('role isPremium').lean(),
  ]);

  if (!post || !currentUser || post.visibleUntil <= new Date()) {
    return { errorCode: 'MILESTONE_POST_NOT_FOUND' };
  }

  if (!sameId(post.user, userId) && !(await areFriends(userId, post.user))) {
    return { errorCode: 'MILESTONE_POST_NOT_FOUND' };
  }

  const reactionLimit = hasPremiumAccess(currentUser)
    ? PREMIUM_REACTION_LIMIT
    : FREE_REACTION_LIMIT;
  const existingLike = await MilestoneLike.findOne({
    milestonePost: milestonePostId,
    user: userId,
    emoji: reactionEmoji,
  });

  if (existingLike) {
    await existingLike.deleteOne();
    post.likeCount = await MilestoneLike.countDocuments({ milestonePost: milestonePostId });
    await post.save();
    const remainingUserReactions = await MilestoneLike.find({
      milestonePost: milestonePostId,
      user: userId,
    })
      .sort({ createdAt: 1 })
      .lean();

    return {
      liked: remainingUserReactions.length > 0,
      milestonePost: await enrichMilestonePost(
        post,
        remainingUserReactions.map((reaction) => reaction.emoji),
        userId
      ),
    };
  }

  const currentUserReactions = await MilestoneLike.find({
    milestonePost: milestonePostId,
    user: userId,
  }).sort({ createdAt: 1 });

  if (reactionLimit === FREE_REACTION_LIMIT && currentUserReactions.length) {
    currentUserReactions[0].emoji = reactionEmoji;
    await currentUserReactions[0].save();
  } else if (currentUserReactions.length >= reactionLimit) {
    return { errorCode: 'MILESTONE_REACTION_LIMIT_REACHED' };
  } else {
    try {
      await createMilestoneReaction({
        milestonePostId,
        userId,
        emoji: reactionEmoji,
      });
    } catch (err) {
      if (err instanceof mongoose.Error.ValidationError) {
        return { errorCode: 'MILESTONE_REACTION_INVALID' };
      }

      throw err;
    }
  }

  post.likeCount = await MilestoneLike.countDocuments({ milestonePost: milestonePostId });
  await post.save();
  const updatedUserReactions = await MilestoneLike.find({
    milestonePost: milestonePostId,
    user: userId,
  })
    .sort({ createdAt: 1 })
    .lean();

  return {
    liked: true,
    milestonePost: await enrichMilestonePost(
      post,
      updatedUserReactions.map((reaction) => reaction.emoji),
      userId
    ),
  };
}
