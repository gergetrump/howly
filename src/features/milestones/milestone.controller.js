import * as milestoneService from './milestone.service.js';
import { validateMilestonePostId } from './milestone.validation.js';

const badRequest = (res, message, code) => {
  const body = { message };

  if (code) {
    body.code = code;
  }

  return res.status(400).json(body);
};

export async function getFriendFeed(req, res) {
  const feed = await milestoneService.getFriendFeed({ userId: req.user.id });

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
  });

  if (errorCode) {
    return badRequest(res, 'Milestone like could not be updated', errorCode);
  }

  return res.status(200).json({ liked, milestonePost });
}
