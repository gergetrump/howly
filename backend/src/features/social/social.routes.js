import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  acceptFriendRequest,
  deleteFriend,
  listFriendRequests,
  listFriends,
  getFriendHabits,
  getFriendChallenges,
  rejectFriendRequest,
  sendFriendRequest,
  blockUser,
  unblockUser,
  listBlockedUsers,
  listBlockers,
} from './social.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/friends', listFriends);
router.get('/friends/:userId/habits', getFriendHabits);
router.get('/friends/:userId/challenges', getFriendChallenges);
router.delete('/friends/:friendshipId', deleteFriend);
router.get('/friends/requests', listFriendRequests);
router.post('/friends/requests', sendFriendRequest);
router.post('/friends/requests/:requestId/accept', acceptFriendRequest);
router.post('/friends/requests/:requestId/reject', rejectFriendRequest);

router.get('/blocked', listBlockedUsers);
router.get('/blockers', listBlockers);
router.post('/block/:userId', blockUser);
router.post('/unblock/:userId', unblockUser);

export default router;
