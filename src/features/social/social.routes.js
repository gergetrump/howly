import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  acceptFriendRequest,
  deleteFriend,
  listFriendRequests,
  listFriends,
  rejectFriendRequest,
  sendFriendRequest,
} from './social.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/friends', listFriends);
router.delete('/friends/:friendshipId', deleteFriend);
router.get('/friends/requests', listFriendRequests);
router.post('/friends/requests', sendFriendRequest);
router.post('/friends/requests/:requestId/accept', acceptFriendRequest);
router.post('/friends/requests/:requestId/reject', rejectFriendRequest);

export default router;
