import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../errors/ApiError.js';
import * as habitService from './habit.service.js';
import { validateSuggestInput } from './habit.validation.js';
import { suggestHabitsFromGoal } from './habitSuggestion.service.js';

/**
 * GET /api/habits
 * Returns a paginated list of the authenticated user's habits.
 */
export const getHabits = asyncHandler(async (req, res) => {
    const result = await habitService.getHabitsForUser(req.user.id, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
    });

    res.status(200).json(result);
});

/**
 * GET /api/habits/:habitId
 * Returns a single habit by ID (ownership enforced in service).
 */
export const getHabitById = asyncHandler(async (req, res) => {
    const habit = await habitService.getHabitById(req.params.habitId, req.user.id);
    res.status(200).json({ data: habit });
});

/**
 * POST /api/habits
 * Creates a new habit for the authenticated user.
 */
export const createHabit = asyncHandler(async (req, res) => {
    const habit = await habitService.createHabit(req.user.id, req.body);
    res.status(201).json({ data: habit });
});

/**
 * POST /api/habits/templates
 * Bulk-creates habits from an array of template objects (onboarding flow).
 */
export const createFromTemplates = asyncHandler(async (req, res) => {
    const habits = await habitService.createHabitsFromTemplates(req.user.id, req.body.templates);
    res.status(201).json({ data: habits });
});

/**
 * PATCH /api/habits/:habitId
 * Partially updates a habit (only the provided fields).
 */
export const updateHabit = asyncHandler(async (req, res) => {
    const habit = await habitService.updateHabit(req.params.habitId, req.user.id, req.body);
    res.status(200).json({ data: habit });
});

/**
 * DELETE /api/habits/:habitId
 * Deletes a habit. Returns 204 No Content.
 */
export const deleteHabit = asyncHandler(async (req, res) => {
    await habitService.deleteHabit(req.params.habitId, req.user.id);
    res.status(204).send();
});

/**
 * POST /api/habits/:habitId/check-ins
 * Marks a habit as completed for today and updates the streak.
 */
export const completeHabit = asyncHandler(async (req, res) => {
    const { habit, milestonePost, boostReward } = await habitService.completeHabit(req.params.habitId, req.user.id);
    res.status(200).json({ data: habit, milestonePost, boostReward });
});

/**
 * DELETE /api/habits/:habitId/check-ins
 * Undo completion of a habit for today.
 */
export const uncompleteHabit = asyncHandler(async (req, res) => {
    const habit = await habitService.uncompleteHabit(req.params.habitId, req.user.id);
    res.status(200).json({ data: habit });
});

/**
 * POST /api/habits/suggest
 * Extracts a short goal from free-text input (a word or a sentence) and returns
 * up to 3 AI habit suggestions: { goal, suggestions }. Nothing is persisted —
 * the client creates the chosen ones afterwards.
 */
export const suggestHabits = asyncHandler(async (req, res) => {
    const { error, value } = validateSuggestInput(req.body);

    if (error) {
        throw ApiError.badRequest(error);
    }

    const result = await suggestHabitsFromGoal(value.goal);
    res.status(200).json({ data: result });
});
