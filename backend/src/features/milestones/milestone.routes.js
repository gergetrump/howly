import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  getFriendFeed,
  getMilestoneReactions,
  toggleMilestoneLike,
} from './milestone.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/feed', getFriendFeed);
router.get('/:milestonePostId/reactions', getMilestoneReactions);
router.post('/:milestonePostId/like', toggleMilestoneLike);

export default router;
