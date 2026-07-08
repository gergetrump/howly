import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { getTrendsAnalyticsSummary } from './trends.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/analytics', getTrendsAnalyticsSummary);

export default router;
