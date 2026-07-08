import { Router } from 'express';
import { requireAuth, requirePremiumAccess } from '../../middleware/auth.middleware.js';
import {
    getHabits,
    getHabitById,
    createHabit,
    createFromTemplates,
    updateHabit,
    deleteHabit,
    completeHabit,
    uncompleteHabit,
    suggestHabits,
} from './habit.controller.js';

const router = Router();

// All habit routes require authentication.
router.use(requireAuth);

// ── Collection routes ───────────────────────────────────────────────
router.get('/', getHabits);
router.post('/', createHabit);
router.post('/templates', createFromTemplates);
router.post('/suggest', requirePremiumAccess, suggestHabits);

// ── Single-resource routes ──────────────────────────────────────────
router.get('/:habitId', getHabitById);
router.patch('/:habitId', updateHabit);
router.delete('/:habitId', deleteHabit);

// ── Check-in (complete a habit for today) ───────────────────────────
router.post('/:habitId/check-ins', completeHabit);
router.delete('/:habitId/check-ins', uncompleteHabit);

export default router;
