import { Router } from 'express';
import { requireAuth, requirePremiumAccess } from '../../middleware/auth.middleware.js';
import { getTrendsAnalyticsSummary } from './trends.controller.js';

const router = Router();

router.use(requireAuth, requirePremiumAccess);

router.get('/analytics', getTrendsAnalyticsSummary);

export default router;
