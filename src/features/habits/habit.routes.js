import { Router } from 'express';
import {
    createHabit,
    deleteHabit,
    getHabitById,
    listHabits,
    updateHabit,
} from './habit.controller.js';

const router = Router();

router.get('/', listHabits);
router.post('/', createHabit);
router.get('/:habitId', getHabitById);
router.patch('/:habitId', updateHabit);
router.delete('/:habitId', deleteHabit);

export default router;
