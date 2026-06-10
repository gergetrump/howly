import mongoose from 'mongoose';
import { toPublicUser } from '../users/user.service.js';
import { Friendship } from '../social/social.model.js';
import Companion from '../companion/companion.model.js';
import config from '../../../config.js';
import {
  MilestoneLike,
  MilestonePost,
  MILESTONE_INTERVAL_DAYS,
} from './milestone.model.js';

const SERVER_BASE_URL = config.serverBaseUrl ?? 'http://localhost:3000';

const ALLOWED_REACTION_EMOJIS = ['🎉', '🔥', '👏', '💜', '✨'];

function sameId(firstId, secondId) {
  return firstId?.toString() === secondId?.toString();
}

function buildFriendshipPair(firstUserId, secondUserId) {
  const [userA, userB] = [firstUserId.toString(), secondUserId.toString()].sort();
  return { userA, userB };
}

function toCompanionResponse(companion) {
  if (!companion) {
    return null;
  }

  return {
    id: companion._id.toString(),
    name: companion.name,
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
  reactionCountsByPostId = new Map(),
  reactionsByPostId = new Map()
) {
  const populatedHabit = post.habit && typeof post.habit === 'object' ? post.habit : null;
  const habitId = populatedHabit?._id?.toString?.() ?? post.habit?.toString?.() ?? post.habit;
  const userId = post.user?._id?.toString?.() ?? post.user?.toString?.() ?? post.user;
  const postId = post._id.toString();
  const currentUserReaction = userReactionsByPostId.get(postId) ?? null;

  return {
    id: postId,
    user: toPublicUser(post.user),
    companion: toCompanionResponse(companionsByUserId.get(userId)),
    habit: {
      id: habitId,
      title: post.habitTitle,
      frequency: populatedHabit?.frequency ?? null,
      icon: populatedHabit?.icon ?? null,
    },
    streakDays: post.streakDays,
    visibleUntil: post.visibleUntil,
    likeCount: post.likeCount,
    likedByCurrentUser: Boolean(currentUserReaction),
    currentUserReaction,
    reactionCounts: reactionCountsByPostId.get(postId) ?? [],
    reactions: reactionsByPostId.get(postId) ?? [],
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

async function getReactionCountsByPostId(postIds) {
  if (!postIds.length) {
    return new Map();
  }

  const groupedReactions = await MilestoneLike.aggregate([
    { $match: { milestonePost: { $in: postIds } } },
    { $group: { _id: { milestonePost: '$milestonePost', emoji: '$emoji' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
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

async function getReactionsByPostId(postIds) {
  if (!postIds.length) {
    return new Map();
  }

  const reactions = await MilestoneLike.find({ milestonePost: { $in: postIds } })
    .populate('user')
    .sort({ createdAt: -1 })
    .lean();
  const reactionsByPostId = new Map();

  reactions.forEach((reaction) => {
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

async function enrichMilestonePost(post, currentUserReaction = null) {
  await post.populate(['user', 'habit']);

  const companion = await Companion.findOne({ user: post.user._id ?? post.user }).lean();
  const companionUserId = companion?.user?.toString();
  const companionsByUserId = companionUserId
    ? new Map([[companionUserId, companion]])
    : new Map();
  const postId = post._id.toString();
  const userReactionsByPostId = currentUserReaction
    ? new Map([[postId, currentUserReaction]])
    : new Map();
  const reactionCountsByPostId = await getReactionCountsByPostId([post._id]);
  const reactionsByPostId = await getReactionsByPostId([post._id]);

  return toMilestonePostResponse(
    post,
    userReactionsByPostId,
    companionsByUserId,
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
  }).lean();
  const userReactionsByPostId = new Map(
    reactions.map((reaction) => [reaction.milestonePost.toString(), reaction.emoji])
  );
  const reactionCountsByPostId = await getReactionCountsByPostId(posts.map((post) => post._id));
  const reactionsByPostId = await getReactionsByPostId(posts.map((post) => post._id));
  const companions = await Companion.find({
    user: { $in: posts.map((post) => post.user._id ?? post.user) },
  }).lean();
  const companionsByUserId = new Map(
    companions.map((companion) => [companion.user.toString(), companion])
  );

  return posts.map((post) =>
    toMilestonePostResponse(
      post,
      userReactionsByPostId,
      companionsByUserId,
      reactionCountsByPostId,
      reactionsByPostId
    )
  );
}

export async function toggleMilestoneLike({ userId, milestonePostId, emoji = '💜' }) {
  if (!ALLOWED_REACTION_EMOJIS.includes(emoji)) {
    return { errorCode: 'MILESTONE_REACTION_INVALID' };
  }

  const post = await MilestonePost.findById(milestonePostId);

  if (!post || post.visibleUntil <= new Date()) {
    return { errorCode: 'MILESTONE_POST_NOT_FOUND' };
  }

  if (!sameId(post.user, userId) && !(await areFriends(userId, post.user))) {
    return { errorCode: 'MILESTONE_POST_NOT_FOUND' };
  }

  const existingLike = await MilestoneLike.findOne({
    milestonePost: milestonePostId,
    user: userId,
  });

  if (existingLike?.emoji === emoji) {
    await existingLike.deleteOne();
    post.likeCount = await MilestoneLike.countDocuments({ milestonePost: milestonePostId });
    await post.save();

    return {
      liked: false,
      milestonePost: await enrichMilestonePost(post),
    };
  }

  if (existingLike) {
    existingLike.emoji = emoji;
    await existingLike.save();
  } else {
    try {
      await MilestoneLike.create({
        milestonePost: milestonePostId,
        user: userId,
        emoji,
      });
    } catch (err) {
      if (err instanceof mongoose.Error.ValidationError || err.code !== 11000) {
        throw err;
      }
    }
  }

  post.likeCount = await MilestoneLike.countDocuments({ milestonePost: milestonePostId });
  await post.save();

  return {
    liked: true,
    milestonePost: await enrichMilestonePost(post, emoji),
  };
}
