import * as socialService from './social.service.js';
import {
  validateFriendRequestId,
  validateFriendshipId,
  validateSendFriendRequestInput,
} from './social.validation.js';

const USER_LOOKUP_FAILED_MESSAGE = 'Hmm, that didn\'t work. Check if the username is correct.';

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

  if (errorCode === 'USER_BLOCKED') {
    return notFound(res, USER_LOOKUP_FAILED_MESSAGE, errorCode);
  }

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

export async function getFriendHabits(req, res) {
  const { habits, ghostMode, errorCode } = await socialService.getFriendHabits({
    userId: req.user.id,
    targetUserId: req.params.userId,
  });

  if (errorCode === 'NOT_FRIENDS') {
    return res.status(403).json({ message: 'You are not friends with this user', code: errorCode });
  }

  return res.status(200).json({ habits, ghostMode: Boolean(ghostMode) });
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

export async function blockUser(req, res) {
  const { blocked, errorCode } = await socialService.blockUser({
    userId: req.user.id,
    targetUserId: req.params.userId,
  });

  if (errorCode === 'USER_NOT_FOUND') {
    return notFound(res, USER_LOOKUP_FAILED_MESSAGE, errorCode);
  }

  if (errorCode) {
    return badRequest(res, 'Could not block user', errorCode);
  }

  return res.status(200).json({ blocked });
}

export async function unblockUser(req, res) {
  const { unblocked } = await socialService.unblockUser({
    userId: req.user.id,
    targetUserId: req.params.userId,
  });

  return res.status(200).json({ unblocked });
}

export async function listBlockedUsers(req, res) {
  const blockedUsers = await socialService.listBlockedUsers({ userId: req.user.id });
  return res.status(200).json(blockedUsers);
}

export async function listBlockers(req, res) {
  const blockerUsernames = await socialService.getUsernamesWhoBlockedMe(req.user.id);
  return res.status(200).json(blockerUsernames);
}
