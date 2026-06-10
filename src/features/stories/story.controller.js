import * as storyService from './story.service.js';
import { validateCreateStoryInput, validateStoryId } from './story.validation.js';

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

  if (errorCode === 'CANNOT_LIKE_OWN_STORY') {
    return badRequest(res, 'You cannot like your own story', errorCode);
  }

  return res.status(200).json({ liked, story });
}

// GET /api/stories/:storyId/likes — who liked (owner only)
export async function getStoryLikes(req, res) {
  const { error } = validateStoryId(req.params.storyId);

  if (error) {
    return badRequest(res, error);
  }

  const { likers, errorCode } = await storyService.getStoryLikes({
    userId: req.user.id,
    storyId: req.params.storyId,
  });

  if (errorCode === 'STORY_NOT_FOUND') {
    return notFound(res);
  }

  return res.status(200).json(likers);
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
