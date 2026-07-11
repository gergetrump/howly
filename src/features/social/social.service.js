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
import Habit from '../habits/habit.model.js';
import { createNotification, deleteNotificationsByFilter, pushToUser } from '../notifications/notification.service.js';
import { Notification } from '../notifications/notification.model.js';
import ChallengeInvitation from '../challenges/challengeInvitation.model.js';
import ChallengeParticipant from '../challenges/challengeParticipant.model.js';
import { toOffsetPage } from '../../utils/pagination.js';

function sameId(firstId, secondId) {
  return firstId?.toString() === secondId?.toString();
}

function buildFriendshipPair(firstUserId, secondUserId) {
  const [userA, userB] = [firstUserId.toString(), secondUserId.toString()].sort();
  return { userA, userB };
}

function toFriendRequestResponse(request) {
  if (!request?.requester || !request?.recipient) {
    return null;
  }

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
  if (!friendship?.userA || !friendship?.userB) {
    return null;
  }

  const otherUser = sameId(friendship.userA._id, currentUserId)
    ? friendship.userB
    : friendship.userA;

  if (!otherUser) {
    return null;
  }

  const friend = toPublicUser(otherUser);
  if (!friend) {
    return null;
  }

  if (otherUser.ghostMode) {
    friend.streak = null;
  }

  return {
    id: friendship._id.toString(),
    friend,
    createdAt: friendship.createdAt,
  };
}

async function areFriends(firstUserId, secondUserId) {
  const pair = buildFriendshipPair(firstUserId, secondUserId);
  const friendship = await Friendship.findOne(pair).lean();

  return Boolean(friendship);
}

async function removeFriendshipBetweenUsers(firstUserId, secondUserId) {
  const pair = buildFriendshipPair(firstUserId, secondUserId);
  return Friendship.deleteOne(pair);
}

function buildTwoUserQuery(firstUserId, secondUserId, firstKey, secondKey) {
  return {
    $or: [
      { [firstKey]: firstUserId, [secondKey]: secondUserId },
      { [firstKey]: secondUserId, [secondKey]: firstUserId },
    ],
  };
}

async function deleteFriendRequestsBetweenUsers(firstUserId, secondUserId) {
  return FriendRequest.deleteMany(buildTwoUserQuery(firstUserId, secondUserId, 'requester', 'recipient'));
}

async function deleteNotificationsBetweenUsers(firstUserId, secondUserId) {
  return deleteNotificationsByFilter(buildTwoUserQuery(firstUserId, secondUserId, 'actor', 'recipient'));
}

async function deletePendingChallengeInvitationsBetweenUsers(firstUserId, secondUserId) {
  return ChallengeInvitation.deleteMany({
    status: 'pending',
    ...buildTwoUserQuery(firstUserId, secondUserId, 'inviter', 'invitee'),
  });
}

async function getOwnedInteractionTargets(userId, targetUserId) {
  const [userStories, targetStories, userMilestones, targetMilestones] = await Promise.all([
    Story.find({ user: userId }, '_id').lean(),
    Story.find({ user: targetUserId }, '_id').lean(),
    MilestonePost.find({ user: userId }, '_id').lean(),
    MilestonePost.find({ user: targetUserId }, '_id').lean(),
  ]);

  const userStoryIds = userStories.map((story) => story._id);
  const targetStoryIds = targetStories.map((story) => story._id);
  const userMilestoneIds = userMilestones.map((milestone) => milestone._id);
  const targetMilestoneIds = targetMilestones.map((milestone) => milestone._id);

  return {
    userStoryIds,
    targetStoryIds,
    userMilestoneIds,
    targetMilestoneIds,
    affectedStoryIds: [...userStoryIds, ...targetStoryIds],
    affectedMilestoneIds: [...userMilestoneIds, ...targetMilestoneIds],
  };
}

async function deleteMutualStoryInteractions({ userId, targetUserId, userStoryIds, targetStoryIds }) {
  const deletedComments = await StoryComment.find({
    $or: [
      { story: { $in: userStoryIds }, user: targetUserId },
      { story: { $in: targetStoryIds }, user: userId },
    ],
  }, '_id').lean();
  const deletedCommentIds = deletedComments.map((comment) => comment._id);

  await Promise.all([
    StoryLike.deleteMany({
      $or: [
        { story: { $in: userStoryIds }, user: targetUserId },
        { story: { $in: targetStoryIds }, user: userId },
      ],
    }),
    deletedCommentIds.length > 0
      ? StoryComment.deleteMany({
          $or: [
            { _id: { $in: deletedCommentIds } },
            { parentComment: { $in: deletedCommentIds } },
          ],
        })
      : Promise.resolve(),
  ]);
}

async function deleteMutualMilestoneReactions({ userId, targetUserId, userMilestoneIds, targetMilestoneIds }) {
  return MilestoneLike.deleteMany({
    $or: [
      { milestonePost: { $in: userMilestoneIds }, user: targetUserId },
      { milestonePost: { $in: targetMilestoneIds }, user: userId },
    ],
  });
}

async function recalculateStoryEngagementCounts(storyIds) {
  if (storyIds.length === 0) return;

  const [updatedStoryLikes, updatedStoryComments] = await Promise.all([
    StoryLike.aggregate([
      { $match: { story: { $in: storyIds } } },
      { $group: { _id: '$story', count: { $sum: 1 } } },
    ]),
    StoryComment.aggregate([
      { $match: { story: { $in: storyIds } } },
      { $group: { _id: '$story', count: { $sum: 1 } } },
    ]),
  ]);

  const likesMap = new Map(updatedStoryLikes.map((group) => [group._id.toString(), group.count]));
  const commentsMap = new Map(updatedStoryComments.map((group) => [group._id.toString(), group.count]));

  await Promise.all(
    storyIds.map((storyId) =>
      Story.updateOne(
        { _id: storyId },
        {
          $set: {
            likeCount: likesMap.get(storyId.toString()) || 0,
            commentCount: commentsMap.get(storyId.toString()) || 0,
          },
        },
      )
    ),
  );
}

async function recalculateMilestoneReactionCounts(milestoneIds) {
  if (milestoneIds.length === 0) return;

  const updatedMilestoneLikes = await MilestoneLike.aggregate([
    { $match: { milestonePost: { $in: milestoneIds } } },
    { $group: { _id: '$milestonePost', count: { $sum: 1 } } },
  ]);
  const reactionsMap = new Map(updatedMilestoneLikes.map((group) => [group._id.toString(), group.count]));

  await Promise.all(
    milestoneIds.map((milestoneId) => {
      const count = reactionsMap.get(milestoneId.toString()) || 0;
      return MilestonePost.updateOne({ _id: milestoneId }, { $set: { likeCount: count } });
    }),
  );
}

function refreshNotificationsForUsers(...userIds) {
  userIds.forEach((id) => pushToUser(id, 'refresh', {}));
}

export async function getFriendHabits({ userId, targetUserId }) {
  if (!(await areFriends(userId, targetUserId))) {
    return { errorCode: 'NOT_FRIENDS' };
  }

  const target = await User.findById(targetUserId).select('ghostMode').lean();
  if (target?.ghostMode) {
    return { ghostMode: true, habits: [] };
  }

  const habits = await Habit.find({
    ownerId: targetUserId,
    source: { $ne: 'challenge' },
  })
    .sort({ createdAt: -1 })
    .lean();

  return {
    ghostMode: false,
    habits: habits.map((habit) => ({
      id: habit._id.toString(),
      title: habit.title,
      icon: habit.icon,
      frequency: habit.frequency,
      streakCount: habit.streakCount ?? 0,
    })),
  };
}

export async function getFriendActiveChallenges({ userId, targetUserId }) {
  if (!(await areFriends(userId, targetUserId))) {
    return { errorCode: 'NOT_FRIENDS' };
  }

  const target = await User.findById(targetUserId).select('ghostMode').lean();
  if (target?.ghostMode) {
    return { ghostMode: true, challenges: [] };
  }

  const now = Date.now();
  const participations = await ChallengeParticipant.find({
    user: targetUserId,
    status: 'active',
  })
    .populate('challenge')
    .lean();

  const challenges = participations
    .filter((participation) => {
      const challenge = participation.challenge;
      return challenge
        && challenge.status !== 'completed'
        && challenge.status !== 'failed'
        && new Date(challenge.endsAt ?? 0).getTime() > now;
    })
    .map((participation) => ({
      id: participation.challenge._id.toString(),
      title: participation.challenge.title,
      totalDays: participation.challenge.durationDays,
      daysCompleted: participation.daysCompleted ?? 0,
    }));

  return { ghostMode: false, challenges };
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

  await createNotification({
    recipientId,
    actorId: requesterId,
    type: 'friend_request_received',
    entityType: 'friendRequest',
    entityId: request._id,
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

export async function listFriendRequests({ userId, incomingPagination = null, outgoingPagination = null }) {
  const incomingQuery = FriendRequest.find({ recipient: userId, status: 'pending' })
    .populate(['requester', 'recipient'])
    .sort({ createdAt: -1 });
  const outgoingQuery = FriendRequest.find({ requester: userId, status: 'pending' })
    .populate(['requester', 'recipient'])
    .sort({ createdAt: -1 });
  const [incoming, outgoing] = await Promise.all([
    incomingPagination ? incomingQuery.limit(incomingPagination.fetchLimit) : incomingQuery,
    outgoingPagination ? outgoingQuery.limit(outgoingPagination.fetchLimit) : outgoingQuery,
  ]);
  const incomingItems = incoming.map(toFriendRequestResponse).filter(Boolean);
  const outgoingItems = outgoing.map(toFriendRequestResponse).filter(Boolean);

  return {
    incoming: incomingPagination ? toOffsetPage(incomingItems, incomingPagination) : incomingItems,
    outgoing: outgoingPagination ? toOffsetPage(outgoingItems, outgoingPagination) : outgoingItems,
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

  await createNotification({
    recipientId: request.requester._id ?? request.requester,
    actorId: userId,
    type: 'friend_request_accepted',
    entityType: 'friendRequest',
    entityId: request._id,
  });

  // Mark the incoming friend request notification as read automatically
  await Notification.updateOne(
    { recipient: userId, type: 'friend_request_received', entityId: requestId },
    { $set: { readAt: new Date() } }
  );

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

  if (request) {
    // Mark the incoming friend request notification as read automatically
    await Notification.updateOne(
      { recipient: userId, type: 'friend_request_received', entityId: requestId },
      { $set: { readAt: new Date() } }
    );
  }

  if (!request) {
    return { errorCode: 'PENDING_FRIEND_REQUEST_NOT_FOUND' };
  }

  return { request: toFriendRequestResponse(request) };
}

export async function listFriends({ userId, pagination = null }) {
  const friendshipsQuery = Friendship.find({
    $or: [{ userA: userId }, { userB: userId }],
  })
    .populate(['userA', 'userB'])
    .sort({ createdAt: -1 });
  const friendships = await (pagination
    ? friendshipsQuery.limit(pagination.fetchLimit)
    : friendshipsQuery);
  const friends = friendships
    .map((friendship) => toFriendshipResponse(friendship, userId))
    .filter(Boolean);

  return pagination ? toOffsetPage(friends, pagination) : friends;
}

export async function deleteFriend({ friendshipId, userId }) {
  const friendship = await Friendship.findOneAndDelete({
    _id: friendshipId,
    $or: [{ userA: userId }, { userB: userId }],
  }).populate(['userA', 'userB']);

  if (!friendship) {
    return { errorCode: 'FRIENDSHIP_NOT_FOUND' };
  }

  // Unfriending only removes future friend-only access. Historical comments,
  // tags, and notifications remain; blocking owns privacy cleanup.
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

  await User.updateOne(
    { _id: userId },
    { $addToSet: { blockedUsers: targetUserId } }
  );

  const interactionTargets = await getOwnedInteractionTargets(userId, targetUserId);

  await Promise.all([
    removeFriendshipBetweenUsers(userId, targetUserId),
    deleteFriendRequestsBetweenUsers(userId, targetUserId),
    deletePendingChallengeInvitationsBetweenUsers(userId, targetUserId),
    deleteMutualStoryInteractions({ userId, targetUserId, ...interactionTargets }),
    deleteMutualMilestoneReactions({ userId, targetUserId, ...interactionTargets }),
    deleteNotificationsBetweenUsers(userId, targetUserId),
  ]);

  await Promise.all([
    recalculateStoryEngagementCounts(interactionTargets.affectedStoryIds),
    recalculateMilestoneReactionCounts(interactionTargets.affectedMilestoneIds),
  ]);

  refreshNotificationsForUsers(userId, targetUserId);

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
