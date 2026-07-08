import { Router } from 'express';
import { requireAuth, requirePremiumAccess } from '../../middleware/auth.middleware.js';
import {
    getChallengeAnalyticsSummary,
    getHabitAnalyticsSummary,
} from './analytics.controller.js';

const router = Router();

router.use(requireAuth, requirePremiumAccess);

router.get('/habits', getHabitAnalyticsSummary);
router.get('/challenges', getChallengeAnalyticsSummary);

export default router;
