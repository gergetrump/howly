import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  acceptFriendRequest,
  getSocialFeed,
  listFriendRequests,
  listFriends,
  rejectFriendRequest,
  sendFriendRequest,
  toggleMilestoneLike,
} from './social.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/friends', listFriends);
router.get('/friends/requests', listFriendRequests);
router.post('/friends/requests', sendFriendRequest);
router.post('/friends/requests/:requestId/accept', acceptFriendRequest);
router.post('/friends/requests/:requestId/reject', rejectFriendRequest);

router.get('/feed', getSocialFeed);
router.post('/milestones/:milestonePostId/like', toggleMilestoneLike);

export default router;
