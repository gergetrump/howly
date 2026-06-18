import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { getHabitAnalyticsSummary } from './analytics.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/habits', getHabitAnalyticsSummary);

export default router;
