import mongoose from 'mongoose';
import User from '../users/user.model.js';
import { toPublicUser } from '../users/user.service.js';
import {
  FriendRequest,
  Friendship,
  MilestoneLike,
  MilestonePost,
  MILESTONE_INTERVAL_DAYS,
} from './social.model.js';

function sameId(firstId, secondId) {
  return firstId?.toString() === secondId?.toString();
}

function buildFriendshipPair(firstUserId, secondUserId) {
  const [userA, userB] = [firstUserId.toString(), secondUserId.toString()].sort();
  return { userA, userB };
}

function toFriendRequestResponse(request) {
  return {
    id: request._id.toString(),
    requester: toPublicUser(request.requester),
    recipient: toPublicUser(request.recipient),
    status: request.status,
    respondedAt: request.respondedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function toFriendshipResponse(friendship, currentUserId) {
  const otherUser = sameId(friendship.userA._id, currentUserId)
    ? friendship.userB
    : friendship.userA;

  return {
    id: friendship._id.toString(),
    friend: toPublicUser(otherUser),
    createdAt: friendship.createdAt,
  };
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

export async function sendFriendRequest({ requesterId, recipientId }) {
  if (sameId(requesterId, recipientId)) {
    return { error: 'cannot send a friend request to yourself' };
  }

  const recipient = await User.findOne({ _id: recipientId, isDeleted: false }).lean();

  if (!recipient) {
    return { error: 'recipient not found' };
  }

  if (await areFriends(requesterId, recipientId)) {
    return { error: 'users are already friends' };
  }

  const existingPendingRequest = await FriendRequest.findOne({
    status: 'pending',
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId },
    ],
  }).lean();

  if (existingPendingRequest) {
    return { error: 'a pending friend request already exists' };
  }

  const request = await FriendRequest.create({
    requester: requesterId,
    recipient: recipientId,
  });

  await request.populate(['requester', 'recipient']);

  return { request: toFriendRequestResponse(request) };
}

export async function listFriendRequests({ userId }) {
  const [incoming, outgoing] = await Promise.all([
    FriendRequest.find({ recipient: userId, status: 'pending' })
      .populate(['requester', 'recipient'])
      .sort({ createdAt: -1 }),
    FriendRequest.find({ requester: userId, status: 'pending' })
      .populate(['requester', 'recipient'])
      .sort({ createdAt: -1 }),
  ]);

  return {
    incoming: incoming.map(toFriendRequestResponse),
    outgoing: outgoing.map(toFriendRequestResponse),
  };
}

export async function acceptFriendRequest({ requestId, userId }) {
  const request = await FriendRequest.findOne({
    _id: requestId,
    recipient: userId,
    status: 'pending',
  });

  if (!request) {
    return { error: 'pending friend request not found' };
  }

  request.status = 'accepted';
  request.respondedAt = new Date();
  await request.save();

  const pair = buildFriendshipPair(request.requester, request.recipient);
  const friendship = await Friendship.findOneAndUpdate(
    pair,
    {
      ...pair,
      acceptedRequest: request._id,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).populate(['userA', 'userB']);

  await request.populate(['requester', 'recipient']);

  return {
    request: toFriendRequestResponse(request),
    friendship: toFriendshipResponse(friendship, userId),
  };
}

export async function rejectFriendRequest({ requestId, userId }) {
  const request = await FriendRequest.findOneAndUpdate(
    {
      _id: requestId,
      recipient: userId,
      status: 'pending',
    },
    {
      status: 'rejected',
      respondedAt: new Date(),
    },
    {
      new: true,
      runValidators: true,
    }
  ).populate(['requester', 'recipient']);

  if (!request) {
    return { error: 'pending friend request not found' };
  }

  return { request: toFriendRequestResponse(request) };
}

export async function listFriends({ userId }) {
  const friendships = await Friendship.find({
    $or: [{ userA: userId }, { userB: userId }],
  })
    .populate(['userA', 'userB'])
    .sort({ createdAt: -1 });

  return friendships.map((friendship) => toFriendshipResponse(friendship, userId));
}

export async function createMilestonePostForHabit(habit) {
  if (!habit || habit.streak < MILESTONE_INTERVAL_DAYS || habit.streak % MILESTONE_INTERVAL_DAYS !== 0) {
    return { milestonePost: null };
  }

  const milestonePost = await MilestonePost.findOneAndUpdate(
    {
      habit: habit._id,
      streakDays: habit.streak,
    },
    {
      user: habit.user,
      habit: habit._id,
      habitTitle: habit.title,
      streakDays: habit.streak,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  return { milestonePost };
}

export async function getSocialFeed({ userId }) {
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
    return { error: 'milestone post not found' };
  }

  if (sameId(post.user, userId)) {
    return { error: 'cannot like your own milestone post' };
  }

  if (!(await areFriends(userId, post.user))) {
    return { error: 'milestone post not found' };
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
