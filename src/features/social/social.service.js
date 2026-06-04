import User from '../users/user.model.js';
import { toPublicUser } from '../users/user.service.js';
import { FriendRequest, Friendship } from './social.model.js';

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

async function areFriends(firstUserId, secondUserId) {
  const pair = buildFriendshipPair(firstUserId, secondUserId);
  const friendship = await Friendship.findOne(pair).lean();

  return Boolean(friendship);
}

export async function sendFriendRequest({ requesterId, recipientId }) {
  if (sameId(requesterId, recipientId)) {
    return { errorCode: 'FRIEND_REQUEST_TO_SELF' };
  }

  const recipient = await User.findOne({ _id: recipientId, isDeleted: false }).lean();

  if (!recipient) {
    return { errorCode: 'FRIEND_REQUEST_RECIPIENT_NOT_FOUND' };
  }

  if (await areFriends(requesterId, recipientId)) {
    return { errorCode: 'USERS_ALREADY_FRIENDS' };
  }

  const existingPendingRequest = await FriendRequest.findOne({
    status: 'pending',
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId },
    ],
  }).lean();

  if (existingPendingRequest) {
    return { errorCode: 'PENDING_FRIEND_REQUEST_EXISTS' };
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
    return { errorCode: 'PENDING_FRIEND_REQUEST_NOT_FOUND' };
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
    return { errorCode: 'PENDING_FRIEND_REQUEST_NOT_FOUND' };
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
