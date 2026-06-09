import mongoose from 'mongoose';
import { toPublicUser } from '../users/user.service.js';
import { Friendship } from '../social/social.model.js';
import {
  MilestoneLike,
  MilestonePost,
  MILESTONE_INTERVAL_DAYS,
} from './milestone.model.js';

function sameId(firstId, secondId) {
  return firstId?.toString() === secondId?.toString();
}

function buildFriendshipPair(firstUserId, secondUserId) {
  const [userA, userB] = [firstUserId.toString(), secondUserId.toString()].sort();
  return { userA, userB };
}

function toMilestonePostResponse(post, likedPostIds = new Set()) {
  return {
    id: post._id.toString(),
    user: toPublicUser(post.user),
    habit: {
      id: post.habit?.toString?.() ?? post.habit,
      title: post.habitTitle,
    },
    streakDays: post.streakDays,
    visibleUntil: post.visibleUntil,
    likeCount: post.likeCount,
    likedByCurrentUser: likedPostIds.has(post._id.toString()),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
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
    .sort({ createdAt: -1 });

  const likes = await MilestoneLike.find({
    user: userId,
    milestonePost: { $in: posts.map((post) => post._id) },
  }).lean();
  const likedPostIds = new Set(likes.map((like) => like.milestonePost.toString()));

  return posts.map((post) => toMilestonePostResponse(post, likedPostIds));
}

export async function toggleMilestoneLike({ userId, milestonePostId }) {
  const post = await MilestonePost.findById(milestonePostId);

  if (!post || post.visibleUntil <= new Date()) {
    return { errorCode: 'MILESTONE_POST_NOT_FOUND' };
  }

  if (sameId(post.user, userId)) {
    return { errorCode: 'CANNOT_LIKE_OWN_MILESTONE' };
  }

  if (!(await areFriends(userId, post.user))) {
    return { errorCode: 'MILESTONE_POST_NOT_FOUND' };
  }

  const existingLike = await MilestoneLike.findOne({
    milestonePost: milestonePostId,
    user: userId,
  });

  if (existingLike) {
    await existingLike.deleteOne();
    post.likeCount = Math.max(0, post.likeCount - 1);
    await post.save();
    await post.populate('user');

    return {
      liked: false,
      milestonePost: toMilestonePostResponse(post),
    };
  }

  try {
    await MilestoneLike.create({
      milestonePost: milestonePostId,
      user: userId,
    });
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError || err.code !== 11000) {
      throw err;
    }
  }

  post.likeCount += 1;
  await post.save();
  await post.populate('user');

  return {
    liked: true,
    milestonePost: toMilestonePostResponse(post, new Set([post._id.toString()])),
  };
}
