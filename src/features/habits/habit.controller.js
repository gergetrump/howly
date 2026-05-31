import * as habitService from './habit.service.js';
import {
    validateCreateHabitInput,
    validateHabitId,
    validateListHabitsInput,
    validateUpdateHabitInput,
} from './habit.validation.js';

const badRequest = (res, message) => res.status(400).json({ message });
const notFound = (res) => res.status(404).json({ message: 'Habit not found' });

export async function createHabit(req, res) {
    const { error, value } = validateCreateHabitInput(req.body);

    if (error) {
        return badRequest(res, error);
    }

    const habit = await habitService.createHabit(value);

    return res.status(201).json(habit);
}

export async function listHabits(req, res) {
    const { error, value } = validateListHabitsInput(req.query);

    if (error) {
        return badRequest(res, error);
    }

    const habits = await habitService.listHabits(value);

    return res.status(200).json(habits);
}

export async function getHabitById(req, res) {
    const { error } = validateHabitId(req.params.habitId);

    if (error) {
        return badRequest(res, error);
    }

    const habit = await habitService.getHabitById(req.params.habitId);

    if (!habit) {
        return notFound(res);
    }

    return res.status(200).json(habit);
}

export async function updateHabit(req, res) {
    const { error: idError } = validateHabitId(req.params.habitId);

    if (idError) {
        return badRequest(res, idError);
    }

    const { error, value } = validateUpdateHabitInput(req.body);

    if (error) {
        return badRequest(res, error);
    }

    const habit = await habitService.updateHabit(req.params.habitId, value);

    if (!habit) {
        return notFound(res);
    }

    return res.status(200).json(habit);
}

export async function deleteHabit(req, res) {
    const { error } = validateHabitId(req.params.habitId);

    if (error) {
        return badRequest(res, error);
    }

    const habit = await habitService.deleteHabit(req.params.habitId);

    if (!habit) {
        return notFound(res);
    }

    return res.status(204).send();
}
