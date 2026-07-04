import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { getCommunityAnalyticsSummary } from './community.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/analytics', getCommunityAnalyticsSummary);

export default router;
