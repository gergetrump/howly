import * as socialService from './social.service.js';
import {
  validateFriendRequestId,
  validateFriendshipId,
  validateSendFriendRequestInput,
} from './social.validation.js';

const badRequest = (res, message, code) => {
  const body = { message };

  if (code) {
    body.code = code;
  }

  return res.status(400).json(body);
};
const notFound = (res, message = 'Resource not found', code) => {
  const body = { message };

  if (code) {
    body.code = code;
  }

  return res.status(404).json(body);
};

export async function sendFriendRequest(req, res) {
  const { error, value: recipientId } = validateSendFriendRequestInput(req.body);

  if (error) {
    return badRequest(res, error);
  }

  const { request, errorCode } = await socialService.sendFriendRequest({
    requesterId: req.user.id,
    recipientId,
  });

  if (errorCode) {
    return badRequest(res, 'Friend request could not be sent', errorCode);
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

  const { request, friendship, errorCode } = await socialService.acceptFriendRequest({
    requestId: req.params.requestId,
    userId: req.user.id,
  });

  if (errorCode) {
    return notFound(res, 'Friend request could not be accepted', errorCode);
  }

  return res.status(200).json({ request, friendship });
}

export async function rejectFriendRequest(req, res) {
  const { error } = validateFriendRequestId(req.params.requestId);

  if (error) {
    return badRequest(res, error);
  }

  const { request, errorCode } = await socialService.rejectFriendRequest({
    requestId: req.params.requestId,
    userId: req.user.id,
  });

  if (errorCode) {
    return notFound(res, 'Friend request could not be rejected', errorCode);
  }

  return res.status(200).json(request);
}

export async function listFriends(req, res) {
  const friends = await socialService.listFriends({ userId: req.user.id });

  return res.status(200).json(friends);
}

export async function deleteFriend(req, res) {
  const { error } = validateFriendshipId(req.params.friendshipId);

  if (error) {
    return badRequest(res, error);
  }

  const { errorCode } = await socialService.deleteFriend({
    friendshipId: req.params.friendshipId,
    userId: req.user.id,
  });

  if (errorCode) {
    return notFound(res, 'Friendship could not be deleted', errorCode);
  }

  return res.status(204).send();
}
