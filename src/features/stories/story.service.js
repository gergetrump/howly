import mongoose from 'mongoose';
import {
  Story,
  StoryLike,
  StoryComment,
  STORY_FEED_VISIBLE_HOURS,
  STORY_ARCHIVE_DAYS,
} from './story.model.js';
import { Friendship } from '../social/social.model.js';
import { getBlockedUserIds } from '../social/social.service.js';
import { MilestonePost } from '../milestones/milestone.model.js';
import Habit from '../habits/habit.model.js';
import Challenge from '../challenges/challenge.model.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../cloudinary/cloudinary.service.js';
import { toPublicUser } from '../users/user.service.js';
import { createNotification, deleteNotificationsByFilter } from '../notifications/notification.service.js';
import User from '../users/user.model.js';
import { toOffsetPage } from '../../utils/pagination.js';
import { moderateCommentText } from '../moderation/moderation.service.js';
import { moderateImage } from '../../moderation/moderation.service.js';

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

function sameId(firstId, secondId) {
  return firstId?.toString() === secondId?.toString();
}

/* Builds the normalized {userA, userB} key (IDs sorted) used to look up a friendship regardless of direction. */
function buildFriendshipPair(firstUserId, secondUserId) {
  const [userA, userB] = [firstUserId.toString(), secondUserId.toString()].sort();
  return { userA, userB };
}

/* Returns whether the two users are friends. */
async function areFriends(firstUserId, secondUserId) {
  const friendship = await Friendship.findOne(buildFriendshipPair(firstUserId, secondUserId)).lean();
  return Boolean(friendship);
}

/* Removes the "story liked" notification for a given actor/story after an unlike. */
async function deleteStoryLikeNotification({ storyId, actorId, recipientId }) {
  await deleteNotificationsByFilter({
    recipient: recipientId,
    actor: actorId,
    type: 'story_liked',
    entityType: 'story',
    entityId: storyId,
  });
}

/* Removes comment/tag notifications tied to the given comment ids. */
async function deleteStoryCommentNotifications(commentIds) {
  if (!commentIds.length) return;

  await deleteNotificationsByFilter({
    type: { $in: ['story_commented', 'story_tagged'] },
    entityType: 'story',
    'metadata.commentId': { $in: commentIds },
  });
}

/* Removes every notification associated with a story. */
async function deleteStoryNotifications(storyId) {
  await deleteNotificationsByFilter({
    entityType: 'story',
    entityId: storyId,
  });
}

/* Maps a story document to its public API response shape. */
export function toStoryResponse(story, likedStoryIds = new Set()) {
  return {
    id: story._id.toString(),
    user: toPublicUser(story.user),
    sourceType: story.sourceType,
    sourceId: story.sourceId?.toString?.() ?? story.sourceId,
    sourceTitle: story.sourceTitle,
    sourceEmoji: story.sourceEmoji,
    imageUrl: story.imageUrl,
    caption: story.caption,
    feedExpiresAt: story.feedExpiresAt,
    archiveExpiresAt: story.archiveExpiresAt,
    likeCount: story.likeCount,
    commentCount: story.commentCount,
    likedByCurrentUser: likedStoryIds.has(story._id.toString()),
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
  };
}

/* Maps a story comment document to its public API response shape. */
export function toStoryCommentResponse(comment) {
  return {
    id: comment._id.toString(),
    user: toPublicUser(comment.user),
    content: comment.content,
    parentComment: comment.parentComment?.toString() || null,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

// Resolve and authorize the source, returning a title/emoji snapshot
async function resolveSource({ userId, sourceType, sourceId }) {
  if (sourceType === 'habit') {
    const habit = await Habit.findOne({ _id: sourceId, ownerId: userId }).lean();

    if (!habit) {
      return { errorCode: 'SOURCE_NOT_FOUND' };
    }

    return { sourceTitle: habit.title, sourceEmoji: habit.icon || '🎯' };
  }

  if (sourceType === 'challenge') {
    const challenge = await Challenge.findById(sourceId).lean();

    if (!challenge) {
      return { errorCode: 'SOURCE_NOT_FOUND' };
    }

    return { sourceTitle: challenge.title, sourceEmoji: '🏋️' };
  }

  if (sourceType === 'milestone') {
    const milestone = await MilestonePost.findOne({ _id: sourceId, user: userId }).lean();

    if (!milestone) {
      return { errorCode: 'SOURCE_NOT_FOUND' };
    }

    return {
      sourceTitle: `${milestone.streakDays}-day streak · ${milestone.habitTitle}`,
      sourceEmoji: '🔥',
    };
  }

  return { errorCode: 'SOURCE_NOT_FOUND' };
}

/* Creates a story from an uploaded image after authorizing the source and moderating the image. */
export async function createStory({ userId, sourceType, sourceId, caption, imageBuffer }) {
  const source = await resolveSource({ userId, sourceType, sourceId });

  if (source.errorCode) {
    return { errorCode: source.errorCode };
  }

  const uploadResult = await uploadBufferToCloudinary(imageBuffer, {
    folder: 'howly/stories',
    resource_type: 'image',
    transformation: [
      {
        width: 1080,
        height: 1080,
        crop: 'limit',
        quality: 'auto',
      },
    ],
  });

  const moderation = await moderateImage(uploadResult.secure_url);
  if (moderation.flagged) {
    await deleteFromCloudinary(uploadResult.public_id);
    return { errorCode: 'STORY_IMAGE_MODERATION_BLOCKED' };
  }

  const now = Date.now();

  const story = await Story.create({
    user: userId,
    sourceType,
    sourceId,
    sourceTitle: source.sourceTitle,
    sourceEmoji: source.sourceEmoji,
    imageUrl: uploadResult.secure_url,
    imagePublicId: uploadResult.public_id,
    caption,
    feedExpiresAt: new Date(now + STORY_FEED_VISIBLE_HOURS * HOUR_IN_MS),
    archiveExpiresAt: new Date(now + STORY_ARCHIVE_DAYS * DAY_IN_MS),
  });

  await story.populate('user');

  return { story: toStoryResponse(story) };
}

/* Counts likes and comments per story, excluding users the viewer has blocked. */
async function getVisibleStoryEngagementCounts({ storyIds, userId }) {
  if (!storyIds.length) {
    return {
      likeCountsByStory: new Map(),
      commentCountsByStory: new Map(),
    };
  }

  const blockedSet = await getBlockedUserIds(userId);
  const hiddenUserIds = [...blockedSet].map((id) => new mongoose.Types.ObjectId(id));

  const likesQuery = { story: { $in: storyIds } };
  const commentsQuery = { story: { $in: storyIds } };

  if (hiddenUserIds.length > 0) {
    likesQuery.user = { $nin: hiddenUserIds };
    commentsQuery.user = { $nin: hiddenUserIds };
  }

  const [allLikes, allComments] = await Promise.all([
    StoryLike.find(likesQuery).lean(),
    StoryComment.find(commentsQuery).lean(),
  ]);

  const likeCountsByStory = new Map();
  allLikes.forEach((like) => {
    const storyId = like.story.toString();
    likeCountsByStory.set(storyId, (likeCountsByStory.get(storyId) || 0) + 1);
  });

  const commentCountsByStory = new Map();
  allComments.forEach((comment) => {
    const storyId = comment.story.toString();
    commentCountsByStory.set(storyId, (commentCountsByStory.get(storyId) || 0) + 1);
  });

  return { likeCountsByStory, commentCountsByStory };
}

/* Builds a single story's response with like/comment counts filtered to what the viewer may see. */
async function toVisibleStoryResponse(story, userId, likedStoryIds = new Set()) {
  const response = toStoryResponse(story, likedStoryIds);
  const { likeCountsByStory, commentCountsByStory } = await getVisibleStoryEngagementCounts({
    storyIds: [story._id],
    userId,
  });

  response.likeCount = likeCountsByStory.get(story._id.toString()) || 0;
  response.commentCount = commentCountsByStory.get(story._id.toString()) || 0;

  return response;
}

// Stories from the user and their friends that are still inside the 30-day feed window
export async function getFriendFeedStories({ userId, limit = null }) {
  const friendships = await Friendship.find({
    $or: [{ userA: userId }, { userB: userId }],
  }).lean();

  const visibleUserIds = new Set([userId.toString()]);

  friendships.forEach((friendship) => {
    const friendId = sameId(friendship.userA, userId) ? friendship.userB : friendship.userA;
    visibleUserIds.add(friendId.toString());
  });

  const storiesQuery = Story.find({
    user: { $in: [...visibleUserIds] },
    feedExpiresAt: { $gt: new Date() },
  })
    .populate('user')
    .sort({ createdAt: -1 });
  const stories = await (Number.isInteger(limit) && limit > 0
    ? storiesQuery.limit(limit)
    : storiesQuery);

  const likes = await StoryLike.find({
    user: userId,
    story: { $in: stories.map((story) => story._id) },
  }).lean();
  const likedStoryIds = new Set(likes.map((like) => like.story.toString()));

  const storyIds = stories.map((s) => s._id);
  const { likeCountsByStory, commentCountsByStory } = await getVisibleStoryEngagementCounts({
    storyIds,
    userId,
  });

  return stories.map((story) => {
    const res = toStoryResponse(story, likedStoryIds);
    res.likeCount = likeCountsByStory.get(story._id.toString()) || 0;
    res.commentCount = commentCountsByStory.get(story._id.toString()) || 0;
    return res;
  });
}

// Own stories still visible in the feed
export async function getMyActiveStories({ userId }) {
  const stories = await Story.find({
    user: userId,
    feedExpiresAt: { $gt: new Date() },
  })
    .populate('user')
    .sort({ createdAt: -1 });

  return stories.map((story) => toStoryResponse(story));
}

// Mixed feed: stories + milestones (for stories specifically)
export async function getFriendFeedStoriesForMixedFeed({ userId, visibleUserIds }) {
  const stories = await Story.find({
    user: { $in: visibleUserIds },
    feedExpiresAt: { $gt: new Date() },
  })
    .populate('user')
    .sort({ createdAt: -1 });

  const likes = await StoryLike.find({
    user: userId,
    story: { $in: stories.map((story) => story._id) },
  }).lean();
  const likedStoryIds = new Set(likes.map((like) => like.story.toString()));

  const storyIds = stories.map((s) => s._id);
  const { likeCountsByStory, commentCountsByStory } = await getVisibleStoryEngagementCounts({
    storyIds,
    userId,
  });

  return stories.map((story) => {
    const res = toStoryResponse(story, likedStoryIds);
    res.likeCount = likeCountsByStory.get(story._id.toString()) || 0;
    res.commentCount = commentCountsByStory.get(story._id.toString()) || 0;
    return res;
  });
}

// Own stories that have already left the 7-day feed window (still within the 90-day TTL)
export async function getMyArchive({ userId }) {
  const stories = await Story.find({ user: userId, feedExpiresAt: { $lte: new Date() } })
    .populate('user')
    .sort({ createdAt: -1 });

  return stories.map((story) => toStoryResponse(story));
}

/* Toggles the current user's like on a story, updating the count and like notification. */
export async function toggleStoryLike({ userId, storyId }) {
  const story = await Story.findById(storyId);

  if (!story || story.feedExpiresAt <= new Date()) {
    return { errorCode: 'STORY_NOT_FOUND' };
  }

  if (!sameId(story.user, userId) && !(await areFriends(userId, story.user))) {
    return { errorCode: 'STORY_NOT_FOUND' };
  }

  const existingLike = await StoryLike.findOne({ story: storyId, user: userId });

  if (existingLike) {
    await existingLike.deleteOne();
    await deleteStoryLikeNotification({
      storyId: story._id,
      actorId: userId,
      recipientId: story.user,
    });
    story.likeCount = Math.max(0, story.likeCount - 1);
    await story.save();
    await story.populate('user');

    return { liked: false, story: await toVisibleStoryResponse(story, userId) };
  }

  try {
    await StoryLike.create({ story: storyId, user: userId });
  } catch (err) {
    // Ignore duplicate-key races; rethrow anything else
    if (err instanceof mongoose.Error.ValidationError || err.code !== 11000) {
      throw err;
    }

    await story.populate('user');

    return {
      liked: true,
      story: await toVisibleStoryResponse(story, userId, new Set([storyId])),
    };
  }

  story.likeCount += 1;
  await story.save();

  await createNotification({
    recipientId: story.user,
    actorId: userId,
    type: 'story_liked',
    entityType: 'story',
    entityId: story._id,
    deduplicate: true, // one notification per (actor, story) — prevents like-spam
  });

  await story.populate('user');

  return {
    liked: true,
    story: await toVisibleStoryResponse(story, userId, new Set([storyId])),
  };
}

// Who liked a story — the owner can always see it (incl. their archive); friends
// only while the story is still inside the feed window.
export async function getStoryLikes({ userId, storyId, pagination = null }) {
  const story = await Story.findById(storyId).lean();

  if (!story) {
    return { errorCode: 'STORY_NOT_FOUND' };
  }

  const isOwner = sameId(story.user, userId);

  if (!isOwner && (story.feedExpiresAt <= new Date() || !(await areFriends(userId, story.user)))) {
    return { errorCode: 'STORY_NOT_FOUND' };
  }

  const blockedSet = await getBlockedUserIds(userId);
  const query = { story: storyId };

  if (blockedSet.size > 0) {
    query.user = { $nin: [...blockedSet].map((id) => new mongoose.Types.ObjectId(id)) };
  }

  const likesQuery = StoryLike.find(query)
    .populate('user')
    .sort({ createdAt: -1 })
    .lean();
  const likes = await (pagination ? likesQuery.limit(pagination.fetchLimit) : likesQuery);
  const likers = likes.map((like) => toPublicUser(like.user)).filter(Boolean);

  return { likers: pagination ? toOffsetPage(likers, pagination) : likers };
}

/* Returns the users (owner and their friends, minus blocked) who can be @mentioned on a story. */
export async function getStoryMentionCandidates({ userId, storyId }) {
  const story = await Story.findById(storyId).lean();

  if (
    !story
    || story.feedExpiresAt <= new Date()
    || (!sameId(story.user, userId) && !(await areFriends(userId, story.user)))
  ) {
    return { errorCode: 'STORY_NOT_FOUND' };
  }

  const friendships = await Friendship.find({
    $or: [{ userA: story.user }, { userB: story.user }],
  }).lean();
  const candidateIds = new Set([story.user.toString()]);

  friendships.forEach((friendship) => {
    const friendId = sameId(friendship.userA, story.user) ? friendship.userB : friendship.userA;
    candidateIds.add(friendId.toString());
  });

  candidateIds.delete(userId.toString());

  const blockedSet = await getBlockedUserIds(userId);
  blockedSet.forEach((blockedUserId) => candidateIds.delete(blockedUserId));

  const candidates = await User.find({
    _id: { $in: [...candidateIds].map((id) => new mongoose.Types.ObjectId(id)) },
    isDeleted: false,
  })
    .sort({ firstName: 1, username: 1 })
    .lean();

  return { candidates: candidates.map(toPublicUser).filter(Boolean) };
}

/* Deletes the user's story along with its image, likes, comments, and notifications. */
export async function deleteStory({ userId, storyId }) {
  const story = await Story.findOne({ _id: storyId, user: userId });

  if (!story) {
    return { errorCode: 'STORY_NOT_FOUND' };
  }

  // remove the image from Cloudinary, then the story and its likes
  try {
    await deleteFromCloudinary(story.imagePublicId);
  } catch (err) {
    console.error('Failed to delete story image from Cloudinary:', err);
  }

  await StoryLike.deleteMany({ story: story._id });
  await StoryComment.deleteMany({ story: story._id });
  await deleteStoryNotifications(story._id);
  await story.deleteOne();

  return { deleted: true };
}

/* Adds an optionally nested comment to a story, moderating it and firing comment/tag notifications. */
export async function addStoryComment({ userId, storyId, content, parentCommentId = null }) {
  const story = await Story.findById(storyId);

  if (!story || story.feedExpiresAt <= new Date()) {
    return { errorCode: 'STORY_NOT_FOUND' };
  }

  if (!sameId(story.user, userId) && !(await areFriends(userId, story.user))) {
    return { errorCode: 'STORY_NOT_FOUND' };
  }

  let finalParentId = null;

  if (parentCommentId) {
    const parentComment = await StoryComment.findOne({ _id: parentCommentId, story: storyId });
    if (!parentComment) {
      return { errorCode: 'PARENT_COMMENT_NOT_FOUND' };
    }
    // Restrict nesting to exactly 1 level (replies of replies become replies to the parent comment)
    finalParentId = parentComment.parentComment || parentComment._id;
  }

  const moderation = moderateCommentText(content);
  if (!moderation.allowed) {
    return { errorCode: moderation.errorCode };
  }

  const comment = await StoryComment.create({
    user: userId,
    story: storyId,
    content,
    parentComment: finalParentId,
  });

  await Story.updateOne({ _id: storyId }, { $inc: { commentCount: 1 } });

  await comment.populate('user');

  const mentionedUsernames = [
    ...new Set(
      (content.match(/@(\w+)/g) ?? []).map((m) => m.slice(1).toLowerCase()),
    ),
  ];
  const storyOwner = await User.findById(story.user, '_id username firstName').lean();
  const storyOwnerName = storyOwner?.firstName || storyOwner?.username || 'someone';
  const storyOwnerWasTagged = storyOwner?.username
    ? mentionedUsernames.includes(storyOwner.username.toLowerCase())
    : false;

  await createNotification({
    recipientId: story.user,
    actorId: userId,
    type: storyOwnerWasTagged ? 'story_tagged' : 'story_commented',
    entityType: 'story',
    entityId: story._id,
    metadata: {
      commentId: comment._id,
      ...(storyOwnerWasTagged ? { taggedOnOwnPost: true } : {}),
    },
  });

  // Fire tag notifications for every @mention in the comment.
  // Rules:
  //  - Only notifies users who can currently see the story (friends with the owner).
  //  - Does not notify the commenter themselves.
  //  - Does not notify the story owner here; their comment/tag notification is
  //    created above so they never receive a duplicate.
  //  - Notifications are NOT created retroactively; this block only runs at
  //    comment-creation time, so future friendships never backfill old tags.
  try {
    if (mentionedUsernames.length > 0) {
      // Resolve all mentioned usernames to user documents in a single query.
      const mentionedUsers = await User.find(
        { username: { $in: mentionedUsernames.map((u) => new RegExp(`^${u}$`, 'i')) } },
        '_id username',
      ).lean();

      await Promise.all(
        mentionedUsers.map(async (tagged) => {
          const taggedId = tagged._id.toString();

          // Skip: the commenter tagged themselves.
          if (taggedId === userId.toString()) return;

          // Skip: the story owner already receives story_commented.
          if (sameId(tagged._id, story.user)) return;

          // Visibility check: tagged user must be friends with the story owner
          // to be able to see the post — only then send the notification.
          const canSeePost = await areFriends(tagged._id, story.user);
          if (!canSeePost) return;

          await createNotification({
            recipientId: tagged._id,
            actorId: userId,
            type: 'story_tagged',
            entityType: 'story',
            entityId: story._id,
            metadata: {
              commentId: comment._id,
              storyOwnerName,
            },
          });
        }),
      );
    }
  } catch {
    // Tag notification failures must never prevent the comment from being returned.
  }

  return { comment: toStoryCommentResponse(comment) };
}

/* Returns a story's comments (paginated parents with their replies), excluding blocked users. */
export async function getStoryComments({ userId, storyId, pagination = null }) {
  const story = await Story.findById(storyId).lean();

  if (!story) {
    return { errorCode: 'STORY_NOT_FOUND' };
  }

  const isOwner = sameId(story.user, userId);

  if (!isOwner && (story.feedExpiresAt <= new Date() || !(await areFriends(userId, story.user)))) {
    return { errorCode: 'STORY_NOT_FOUND' };
  }

  const blockedSet = await getBlockedUserIds(userId);
  const commentVisibilityQuery = { story: storyId };

  if (blockedSet.size > 0) {
    commentVisibilityQuery.user = { $nin: [...blockedSet].map((id) => new mongoose.Types.ObjectId(id)) };
  }

  if (pagination) {
    const parents = await StoryComment.find({
      ...commentVisibilityQuery,
      parentComment: null,
    })
      .populate('user')
      .sort({ createdAt: 1 })
      .limit(pagination.fetchLimit)
      .lean();
    const pagedParents = toOffsetPage(parents, pagination);
    const parentIds = pagedParents.items.map((comment) => comment._id);
    const replies = parentIds.length
      ? await StoryComment.find({
        ...commentVisibilityQuery,
        parentComment: { $in: parentIds },
      })
        .populate('user')
        .sort({ createdAt: 1 })
        .lean()
      : [];
    const comments = [...pagedParents.items, ...replies].map(toStoryCommentResponse);

    return {
      comments: {
        ...pagedParents,
        items: comments,
      },
    };
  }

  const comments = await StoryComment.find(commentVisibilityQuery)
    .populate('user')
    .sort({ createdAt: 1 })
    .lean();

  return { comments: comments.map(toStoryCommentResponse) };
}

/* Deletes a comment (and its replies if it is a parent) and refreshes the story's comment count. */
export async function deleteStoryComment({ userId, storyId, commentId }) {
  const comment = await StoryComment.findOne({ _id: commentId, story: storyId });

  if (!comment) {
    return { errorCode: 'COMMENT_NOT_FOUND' };
  }

  const story = await Story.findById(storyId);
  if (!story || story.feedExpiresAt <= new Date()) {
    return { errorCode: 'STORY_NOT_FOUND' };
  }

  const isCommentAuthor = sameId(comment.user, userId);
  const isStoryOwner = sameId(story.user, userId);

  if (!isCommentAuthor && !isStoryOwner) {
    return { errorCode: 'COMMENT_NOT_FOUND' };
  }

  const deletedCommentIds = [comment._id];

  // If this is a parent comment, delete all its replies as well
  if (!comment.parentComment) {
    const replies = await StoryComment.find({ parentComment: comment._id }, '_id').lean();
    deletedCommentIds.push(...replies.map((reply) => reply._id));
    await StoryComment.deleteMany({ parentComment: comment._id });
  }

  await comment.deleteOne();
  await deleteStoryCommentNotifications(deletedCommentIds);

  const remainingCommentCount = await StoryComment.countDocuments({ story: storyId });
  await Story.updateOne({ _id: storyId }, { commentCount: remainingCommentCount });

  return { deleted: true };
}
