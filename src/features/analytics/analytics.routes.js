import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
    getChallengeAnalyticsSummary,
    getHabitAnalyticsSummary,
} from './analytics.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/habits', getHabitAnalyticsSummary);
router.get('/challenges', getChallengeAnalyticsSummary);

export default router;
