import * as socialService from './social.service.js';
import {
  validateFriendRequestId,
  validateMilestonePostId,
  validateSendFriendRequestInput,
} from './social.validation.js';

const badRequest = (res, message) => res.status(400).json({ message });
const notFound = (res, message = 'Resource not found') => res.status(404).json({ message });

export async function sendFriendRequest(req, res) {
  const { error, value: recipientId } = validateSendFriendRequestInput(req.body);

  if (error) {
    return badRequest(res, error);
  }

  const { request, error: serviceError } = await socialService.sendFriendRequest({
    requesterId: req.user.id,
    recipientId,
  });

  if (serviceError) {
    return badRequest(res, serviceError);
  }

  return res.status(201).json(request);
}

export async function listFriendRequests(req, res) {
  const requests = await socialService.listFriendRequests({ userId: req.user.id });

  return res.status(200).json(requests);
}

export async function acceptFriendRequest(req, res) {
  const { error } = validateFriendRequestId(req.params.requestId);

  if (error) {
    return badRequest(res, error);
  }

  const { request, friendship, error: serviceError } = await socialService.acceptFriendRequest({
    requestId: req.params.requestId,
    userId: req.user.id,
  });

  if (serviceError) {
    return notFound(res, serviceError);
  }

  return res.status(200).json({ request, friendship });
}

export async function rejectFriendRequest(req, res) {
  const { error } = validateFriendRequestId(req.params.requestId);

  if (error) {
    return badRequest(res, error);
  }

  const { request, error: serviceError } = await socialService.rejectFriendRequest({
    requestId: req.params.requestId,
    userId: req.user.id,
  });

  if (serviceError) {
    return notFound(res, serviceError);
  }

  return res.status(200).json(request);
}

export async function listFriends(req, res) {
  const friends = await socialService.listFriends({ userId: req.user.id });

  return res.status(200).json(friends);
}

export async function getSocialFeed(req, res) {
  const feed = await socialService.getSocialFeed({ userId: req.user.id });

  return res.status(200).json(feed);
}

export async function toggleMilestoneLike(req, res) {
  const { error } = validateMilestonePostId(req.params.milestonePostId);

  if (error) {
    return badRequest(res, error);
  }

  const { liked, milestonePost, error: serviceError } = await socialService.toggleMilestoneLike({
    userId: req.user.id,
    milestonePostId: req.params.milestonePostId,
  });

  if (serviceError) {
    return badRequest(res, serviceError);
  }

  return res.status(200).json({ liked, milestonePost });
}
