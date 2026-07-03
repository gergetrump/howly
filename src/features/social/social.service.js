import User from '../users/user.model.js';
import { toPublicUser } from '../users/user.service.js';
import { FriendRequest, Friendship } from './social.model.js';
import { Story, StoryLike, StoryComment } from '../stories/story.model.js';
import { MilestonePost, MilestoneLike } from '../milestones/milestone.model.js';
import { sendFriendRequestEmail } from '../mail/mail.service.js';
import config from '../../../config.js';

function canSendNotificationEmail(user, preferenceKey) {
  const preferences = user?.notificationPreferences ?? {};

  return preferences.emailEnabled === true && preferences[preferenceKey] === true;
}

function getUserDisplayName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.username || 'A friend';
}

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

  const requester = await User.findById(requesterId).lean();
  const recipient = await User.findOne({ _id: recipientId, isDeleted: false }).lean();

  if (!recipient) {
    return { errorCode: 'FRIEND_REQUEST_RECIPIENT_NOT_FOUND' };
  }

  const recipientBlocked = requester?.blockedUsers?.some(id => sameId(id, recipientId));
  const requesterBlocked = recipient?.blockedUsers?.some(id => sameId(id, requesterId));

  if (recipientBlocked || requesterBlocked) {
    return { errorCode: 'USER_BLOCKED' };
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

  if (canSendNotificationEmail(recipient, 'friendRequests')) {
    sendFriendRequestEmail(recipient.email, {
      requesterName: getUserDisplayName(requester),
      socialUrl: `${config.frontendBaseUrl}/social`,
    }).catch((error) => {
      console.error('Failed to send friend request email:', error);
    });
  }

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
      returnDocument: 'after',
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
      returnDocument: 'after',
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

export async function deleteFriend({ friendshipId, userId }) {
  const friendship = await Friendship.findOneAndDelete({
    _id: friendshipId,
    $or: [{ userA: userId }, { userB: userId }],
  }).populate(['userA', 'userB']);

  if (!friendship) {
    return { errorCode: 'FRIENDSHIP_NOT_FOUND' };
  }

  return { friendship: toFriendshipResponse(friendship, userId) };
}

export async function blockUser({ userId, targetUserId }) {
  if (sameId(userId, targetUserId)) {
    return { errorCode: 'CANNOT_BLOCK_SELF' };
  }

  const targetUser = await User.findOne({ _id: targetUserId, isDeleted: false });
  if (!targetUser) {
    return { errorCode: 'USER_NOT_FOUND' };
  }

  // Add targetUserId to current user's blockedUsers
  await User.updateOne(
    { _id: userId },
    { $addToSet: { blockedUsers: targetUserId } }
  );

  // Sever friendship
  const pair = buildFriendshipPair(userId, targetUserId);
  await Friendship.deleteOne(pair);

  // Delete pending/accepted friend requests
  await FriendRequest.deleteMany({
    $or: [
      { requester: userId, recipient: targetUserId },
      { requester: targetUserId, recipient: userId }
    ]
  });

  // Delete likes and reactions on each other's posts
  const [myStories, targetStories, myMilestones, targetMilestones] = await Promise.all([
    Story.find({ user: userId }, '_id').lean(),
    Story.find({ user: targetUserId }, '_id').lean(),
    MilestonePost.find({ user: userId }, '_id').lean(),
    MilestonePost.find({ user: targetUserId }, '_id').lean(),
  ]);

  const myStoryIds = myStories.map((s) => s._id);
  const targetStoryIds = targetStories.map((s) => s._id);
  const myMilestoneIds = myMilestones.map((m) => m._id);
  const targetMilestoneIds = targetMilestones.map((m) => m._id);

  // Deletions
  const deletedComments = await StoryComment.find({
    $or: [
      { story: { $in: myStoryIds }, user: targetUserId },
      { story: { $in: targetStoryIds }, user: userId }
    ]
  }, '_id').lean();
  const deletedCommentIds = deletedComments.map((c) => c._id);

  await Promise.all([
    // StoryLikes
    StoryLike.deleteMany({
      $or: [
        { story: { $in: myStoryIds }, user: targetUserId },
        { story: { $in: targetStoryIds }, user: userId }
      ]
    }),
    // MilestoneLikes
    MilestoneLike.deleteMany({
      $or: [
        { milestonePost: { $in: myMilestoneIds }, user: targetUserId },
        { milestonePost: { $in: targetMilestoneIds }, user: userId }
      ]
    }),
    // StoryComments (direct + replies)
    deletedCommentIds.length > 0
      ? StoryComment.deleteMany({
          $or: [
            { _id: { $in: deletedCommentIds } },
            { parentComment: { $in: deletedCommentIds } }
          ]
        })
      : Promise.resolve()
  ]);

  // Recalculate likeCount for affected stories
  const affectedStoryIds = [...myStoryIds, ...targetStoryIds];
  if (affectedStoryIds.length > 0) {
    const updatedStoryLikes = await StoryLike.aggregate([
      { $match: { story: { $in: affectedStoryIds } } },
      { $group: { _id: '$story', count: { $sum: 1 } } }
    ]);
    const likesMap = new Map(updatedStoryLikes.map((group) => [group._id.toString(), group.count]));

    await Promise.all(
      affectedStoryIds.map((storyId) => {
        const count = likesMap.get(storyId.toString()) || 0;
        return Story.updateOne({ _id: storyId }, { $set: { likeCount: count } });
      })
    );
  }

  // Recalculate commentCount for affected stories
  if (affectedStoryIds.length > 0) {
    const updatedStoryComments = await StoryComment.aggregate([
      { $match: { story: { $in: affectedStoryIds } } },
      { $group: { _id: '$story', count: { $sum: 1 } } }
    ]);
    const commentsMap = new Map(updatedStoryComments.map((group) => [group._id.toString(), group.count]));

    await Promise.all(
      affectedStoryIds.map((storyId) => {
        const count = commentsMap.get(storyId.toString()) || 0;
        return Story.updateOne({ _id: storyId }, { $set: { commentCount: count } });
      })
    );
  }

  // Recalculate likeCount for affected milestones
  const affectedMilestoneIds = [...myMilestoneIds, ...targetMilestoneIds];
  if (affectedMilestoneIds.length > 0) {
    const updatedMilestoneLikes = await MilestoneLike.aggregate([
      { $match: { milestonePost: { $in: affectedMilestoneIds } } },
      { $group: { _id: '$milestonePost', count: { $sum: 1 } } }
    ]);
    const reactionsMap = new Map(updatedMilestoneLikes.map((group) => [group._id.toString(), group.count]));

    await Promise.all(
      affectedMilestoneIds.map((milestoneId) => {
        const count = reactionsMap.get(milestoneId.toString()) || 0;
        return MilestonePost.updateOne({ _id: milestoneId }, { $set: { likeCount: count } });
      })
    );
  }

  return { blocked: true };
}

export async function unblockUser({ userId, targetUserId }) {
  await User.updateOne(
    { _id: userId },
    { $pull: { blockedUsers: targetUserId } }
  );

  return { unblocked: true };
}

export async function listBlockedUsers({ userId }) {
  const user = await User.findById(userId).populate('blockedUsers').lean();
  const blockedList = user?.blockedUsers || [];
  return blockedList.map(toPublicUser).filter(Boolean);
}

export async function getBlockedUserIds(userId) {
  if (!userId) return new Set();
  const user = await User.findById(userId).select('blockedUsers').lean();
  const blockedByMe = user?.blockedUsers || [];
  const blockedMe = await User.find({ blockedUsers: userId }, '_id').lean();
  return new Set([
    ...blockedByMe.map((id) => id.toString()),
    ...blockedMe.map((id) => id._id.toString()),
  ]);
}

export async function getUsernamesWhoBlockedMe(userId) {
  const blockers = await User.find({ blockedUsers: userId }, 'username').lean();
  return blockers.map((u) => (u.username || '').toLowerCase());
}

