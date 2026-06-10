import * as milestoneService from './milestone.service.js';
import { getFriendFeedStories } from '../stories/story.service.js';
import { validateMilestonePostId } from './milestone.validation.js';

const badRequest = (res, message, code) => {
  const body = { message };

  if (code) {
    body.code = code;
  }

  return res.status(400).json(body);
};

// Mixed feed: milestones + stories from the user and their friends, newest first
export async function getFriendFeed(req, res) {
  const [milestones, stories] = await Promise.all([
    milestoneService.getFriendFeed({ userId: req.user.id }),
    getFriendFeedStories({ userId: req.user.id }),
  ]);

  const feed = [
    ...milestones.map((post) => ({ type: 'milestone', ...post })),
    ...stories.map((story) => ({ type: 'story', ...story })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
