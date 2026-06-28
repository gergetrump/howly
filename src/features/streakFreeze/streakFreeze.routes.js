import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { freezeHabitStreak, freezeOverallStreak } from './streakFreeze.controller.js';

const router = Router();

router.use(requireAuth);

router.post('/habits/:habitId', freezeHabitStreak);
router.post('/overall', freezeOverallStreak);

export default router;
