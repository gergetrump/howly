import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { freezeHabitStreak, freezeOverallStreak, getStreakCalendarSummary } from './streakFreeze.controller.js';

const router = Router();

router.use(requireAuth);

/* Get the streak calendar summary for a month. */
router.get('/calendar', getStreakCalendarSummary);
/* Spend a shield to rescue a specific habit's streak. */
router.post('/habits/:habitId', freezeHabitStreak);
/* Spend a shield to rescue the overall streak. */
router.post('/overall', freezeOverallStreak);

export default router;
