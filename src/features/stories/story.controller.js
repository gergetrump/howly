import * as storyService from './story.service.js';
import { COMMENT_MODERATION_BLOCKED } from '../moderation/moderation.service.js';
import {
  validateCommentInput,
  validateCreateStoryInput,
  validateStoryId,
  validateStoryListPagination,
} from './story.validation.js';

const badRequest = (res, message, code) => {
  const body = { message };

  if (code) {
    body.code = code;
  }

  return res.status(400).json(body);
};

const notFound = (res, message = 'Story not found') => res.status(404).json({ message });

// POST /api/stories — multipart with `image` file + sourceType/sourceId/caption fields
export async function createStory(req, res) {
  if (!req.file) {
    return badRequest(res, 'No image uploaded');
  }

  const { error, value } = validateCreateStoryInput(req.body);

  if (error) {
    return badRequest(res, error);
  }

  try {
    const { story, errorCode } = await storyService.createStory({
      userId: req.user.id,
      sourceType: value.sourceType,
      sourceId: value.sourceId,
      caption: value.caption,
      imageBuffer: req.file.buffer,
    });

    if (errorCode === 'SOURCE_NOT_FOUND') {
      return notFound(res, 'Source not found or not yours');
    }

    return res.status(201).json(story);
  } catch (err) {
    console.error('Failed to create story:', err);
    return res.status(500).json({ message: 'Failed to create story' });
  }
}

// GET /api/stories/me — own stories still visible in the feed
export async function getMyActiveStories(req, res) {
  const stories = await storyService.getMyActiveStories({ userId: req.user.id });

  return res.status(200).json(stories);
}

// GET /api/stories/me/archive — all own stories (up to 90 days)
export async function getMyArchive(req, res) {
  const stories = await storyService.getMyArchive({ userId: req.user.id });

  return res.status(200).json(stories);
}

// POST /api/stories/:storyId/like — toggle like
export async function toggleStoryLike(req, res) {
  const { error } = validateStoryId(req.params.storyId);

  if (error) {
    return badRequest(res, error);
  }

  const { liked, story, errorCode } = await storyService.toggleStoryLike({
    userId: req.user.id,
    storyId: req.params.storyId,
  });

  if (errorCode === 'STORY_NOT_FOUND') {
    return notFound(res);
  }

  return res.status(200).json({ liked, story });
}

// GET /api/stories/:storyId/likes — who liked (owner and friends who can view it)
export async function getStoryLikes(req, res) {
  const { error } = validateStoryId(req.params.storyId);

  if (error) {
    return badRequest(res, error);
  }

  const { error: paginationError, value: pagination } = validateStoryListPagination(req.query, {
    defaultLimit: 20,
  });

  if (paginationError) {
    return badRequest(res, paginationError);
  }

  const { likers, errorCode } = await storyService.getStoryLikes({
    userId: req.user.id,
    storyId: req.params.storyId,
    pagination,
  });

  if (errorCode === 'STORY_NOT_FOUND') {
    return notFound(res);
  }

  return res.status(200).json(likers);
}

// GET /api/stories/:storyId/mention-candidates — users who can see this story
export async function getStoryMentionCandidates(req, res) {
  const { error } = validateStoryId(req.params.storyId);

  if (error) {
    return badRequest(res, error);
  }

  const { candidates, errorCode } = await storyService.getStoryMentionCandidates({
    userId: req.user.id,
    storyId: req.params.storyId,
  });

  if (errorCode === 'STORY_NOT_FOUND') {
    return notFound(res);
  }

  return res.status(200).json(candidates);
}

// DELETE /api/stories/:storyId — delete own story
export async function deleteStory(req, res) {
  const { error } = validateStoryId(req.params.storyId);

  if (error) {
    return badRequest(res, error);
  }

  const { errorCode } = await storyService.deleteStory({
    userId: req.user.id,
    storyId: req.params.storyId,
  });

  if (errorCode === 'STORY_NOT_FOUND') {
    return notFound(res);
  }

  return res.status(204).send();
}

// POST /api/stories/:storyId/comments
export async function addStoryComment(req, res) {
  const { error: idError } = validateStoryId(req.params.storyId);

  if (idError) {
    return badRequest(res, idError);
  }

  const { error: validationError, value } = validateCommentInput(req.body);

  if (validationError) {
    return badRequest(res, validationError);
  }

  const { comment, errorCode } = await storyService.addStoryComment({
    userId: req.user.id,
    storyId: req.params.storyId,
    content: value.content,
    parentCommentId: value.parentCommentId,
  });

  if (errorCode === 'STORY_NOT_FOUND') {
    return notFound(res);
  }

  if (errorCode === 'PARENT_COMMENT_NOT_FOUND') {
    return badRequest(res, 'Parent comment not found');
  }

  if (errorCode === COMMENT_MODERATION_BLOCKED) {
    return badRequest(res, 'Please keep comments respectful.', COMMENT_MODERATION_BLOCKED);
  }

  return res.status(201).json(comment);
}

// GET /api/stories/:storyId/comments
export async function getStoryComments(req, res) {
  const { error } = validateStoryId(req.params.storyId);

  if (error) {
    return badRequest(res, error);
  }

  const { error: paginationError, value: pagination } = validateStoryListPagination(req.query, {
    defaultLimit: 10,
  });

  if (paginationError) {
    return badRequest(res, paginationError);
  }

  const { comments, errorCode } = await storyService.getStoryComments({
    userId: req.user.id,
    storyId: req.params.storyId,
    pagination,
  });

  if (errorCode === 'STORY_NOT_FOUND') {
    return notFound(res);
  }

  return res.status(200).json(comments);
}

// DELETE /api/stories/:storyId/comments/:commentId
export async function deleteStoryComment(req, res) {
  const { error: storyIdError } = validateStoryId(req.params.storyId);
  const { error: commentIdError } = validateStoryId(req.params.commentId);

  if (storyIdError || commentIdError) {
    return badRequest(res, storyIdError || commentIdError);
  }

  const { errorCode } = await storyService.deleteStoryComment({
    userId: req.user.id,
    storyId: req.params.storyId,
    commentId: req.params.commentId,
  });

  if (errorCode === 'STORY_NOT_FOUND') {
    return notFound(res);
  }

  if (errorCode === 'COMMENT_NOT_FOUND') {
    return notFound(res, 'Comment not found or not yours');
  }

  return res.status(204).send();
}
