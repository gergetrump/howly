import mongoose from 'mongoose';
import {
  Story,
  StoryLike,
  StoryComment,
  STORY_FEED_VISIBLE_HOURS,
  STORY_ARCHIVE_DAYS,
} from './story.model.js';
import { Friendship } from '../social/social.model.js';
import { MilestonePost } from '../milestones/milestone.model.js';
import Habit from '../habits/habit.model.js';
import Challenge from '../challenges/challenge.model.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../cloudinary/cloudinary.service.js';
import { toPublicUser } from '../users/user.service.js';

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

function sameId(firstId, secondId) {
  return firstId?.toString() === secondId?.toString();
}

function buildFriendshipPair(firstUserId, secondUserId) {
  const [userA, userB] = [firstUserId.toString(), secondUserId.toString()].sort();
  return { userA, userB };
}

async function areFriends(firstUserId, secondUserId) {
  const friendship = await Friendship.findOne(buildFriendshipPair(firstUserId, secondUserId)).lean();
  return Boolean(friendship);
}

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

// Stories from the user and their friends that are still inside the 7-day feed window
export async function getFriendFeedStories({ userId }) {
  const friendships = await Friendship.find({
    $or: [{ userA: userId }, { userB: userId }],
  }).lean();

  const visibleUserIds = new Set([userId.toString()]);

  friendships.forEach((friendship) => {
    const friendId = sameId(friendship.userA, userId) ? friendship.userB : friendship.userA;
    visibleUserIds.add(friendId.toString());
  });

  const stories = await Story.find({
    user: { $in: [...visibleUserIds] },
    feedExpiresAt: { $gt: new Date() },
  })
    .populate('user')
    .sort({ createdAt: -1 });

  const likes = await StoryLike.find({
    user: userId,
    story: { $in: stories.map((story) => story._id) },
  }).lean();
  const likedStoryIds = new Set(likes.map((like) => like.story.toString()));

  return stories.map((story) => toStoryResponse(story, likedStoryIds));
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

// All own stories (up to 90 days — TTL removes older ones automatically)
export async function getMyArchive({ userId }) {
  const stories = await Story.find({ user: userId })
    .populate('user')
    .sort({ createdAt: -1 });

  return stories.map((story) => toStoryResponse(story));
}

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
    story.likeCount = Math.max(0, story.likeCount - 1);
    await story.save();
    await story.populate('user');

    return { liked: false, story: toStoryResponse(story) };
  }

  try {
    await StoryLike.create({ story: storyId, user: userId });
  } catch (err) {
    // Ignore duplicate-key races; rethrow anything else
    if (err instanceof mongoose.Error.ValidationError || err.code !== 11000) {
      throw err;
    }

    await story.populate('user');

    return { liked: true, story: toStoryResponse(story, new Set([storyId])) };
  }

  story.likeCount += 1;
  await story.save();
  await story.populate('user');

  return { liked: true, story: toStoryResponse(story, new Set([storyId])) };
}

// Who liked a story — available to the owner and friends who can see the story
export async function getStoryLikes({ userId, storyId }) {
  const story = await Story.findById(storyId).lean();

  if (
    !story
    || story.feedExpiresAt <= new Date()
    || (!sameId(story.user, userId) && !(await areFriends(userId, story.user)))
  ) {
    return { errorCode: 'STORY_NOT_FOUND' };
  }

  const likes = await StoryLike.find({ story: storyId })
    .populate('user')
    .sort({ createdAt: -1 })
    .lean();

  return { likers: likes.map((like) => toPublicUser(like.user)).filter(Boolean) };
}

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
  await story.deleteOne();

  return { deleted: true };
}

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

  const comment = await StoryComment.create({
    user: userId,
    story: storyId,
    content,
    parentComment: finalParentId,
  });

  story.commentCount += 1;
  await story.save();

  await comment.populate('user');

  return { comment: toStoryCommentResponse(comment) };
}

export async function getStoryComments({ userId, storyId }) {
  const story = await Story.findById(storyId).lean();

  if (
    !story
    || story.feedExpiresAt <= new Date()
    || (!sameId(story.user, userId) && !(await areFriends(userId, story.user)))
  ) {
    return { errorCode: 'STORY_NOT_FOUND' };
  }

  const comments = await StoryComment.find({ story: storyId })
    .populate('user')
    .sort({ createdAt: 1 })
    .lean();

  return { comments: comments.map(toStoryCommentResponse) };
}

export async function deleteStoryComment({ userId, storyId, commentId }) {
  const comment = await StoryComment.findOne({ _id: commentId, story: storyId });

  if (!comment) {
    return { errorCode: 'COMMENT_NOT_FOUND' };
  }

  const story = await Story.findById(storyId);
  if (!story) {
    return { errorCode: 'STORY_NOT_FOUND' };
  }

  const isCommentAuthor = sameId(comment.user, userId);
  const isStoryOwner = sameId(story.user, userId);

  if (!isCommentAuthor && !isStoryOwner) {
    return { errorCode: 'COMMENT_NOT_FOUND' };
  }

  let deletedCount = 1;

  // If this is a parent comment, delete all its replies as well
  if (!comment.parentComment) {
    const replies = await StoryComment.find({ parentComment: comment._id });
    deletedCount += replies.length;
    await StoryComment.deleteMany({ parentComment: comment._id });
  }

  await comment.deleteOne();

  await Story.updateOne({ _id: storyId }, { $inc: { commentCount: -deletedCount } });

  return { deleted: true };
}
