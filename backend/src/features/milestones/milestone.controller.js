import * as milestoneService from './milestone.service.js';
import { getFriendFeedStories } from '../stories/story.service.js';
import { validateFeedPagination, validateMilestonePostId } from './milestone.validation.js';
import { validateOffsetPagination } from '../../utils/pagination.js';

const badRequest = (res, message, code) => {
  const body = { message };

  if (code) {
    body.code = code;
  }

  return res.status(400).json(body);
};

// Mixed feed: milestones + stories from the user and their friends, newest first
export async function getFriendFeed(req, res) {
  const { error, value: pagination } = validateFeedPagination(req.query);

  if (error) {
    return badRequest(res, error);
  }

  const [milestones, stories] = await Promise.all([
    milestoneService.getFriendFeed({ userId: req.user.id, limit: pagination?.fetchLimit }),
    getFriendFeedStories({ userId: req.user.id, limit: pagination?.fetchLimit }),
  ]);

  const feed = [
    ...milestones.map((post) => ({ type: 'milestone', ...post })),
    ...stories.map((story) => ({ type: 'story', ...story })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (pagination) {
    const end = pagination.offset + pagination.limit;
    const items = feed.slice(pagination.offset, end);

    return res.status(200).json({
      items,
      hasMore: feed.length > end,
      limit: pagination.limit,
      offset: pagination.offset,
      nextOffset: pagination.offset + items.length,
    });
  }

  return res.status(200).json(feed);
}

export async function toggleMilestoneLike(req, res) {
  const { error } = validateMilestonePostId(req.params.milestonePostId);

  if (error) {
    return badRequest(res, error);
  }

  const { liked, milestonePost, errorCode } = await milestoneService.toggleMilestoneLike({
    userId: req.user.id,
    milestonePostId: req.params.milestonePostId,
    emoji: req.body?.emoji,
  });

  if (errorCode) {
    return badRequest(res, 'Milestone like could not be updated', errorCode);
  }

  return res.status(200).json({ liked, milestonePost });
}

export async function getMilestoneReactions(req, res) {
  const { error } = validateMilestonePostId(req.params.milestonePostId);

  if (error) {
    return badRequest(res, error);
  }

  const { error: paginationError, value: pagination } = validateOffsetPagination(req.query, {
    defaultLimit: 20,
    maxLimit: 50,
  });

  if (paginationError) {
    return badRequest(res, paginationError);
  }

  const { reactions, errorCode } = await milestoneService.getMilestoneReactions({
    userId: req.user.id,
    milestonePostId: req.params.milestonePostId,
    pagination,
  });

  if (errorCode) {
    return res.status(404).json({ message: 'Milestone post not found', code: errorCode });
  }

  return res.status(200).json(reactions);
}
