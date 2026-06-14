import { asyncHandler } from '../../utils/asyncHandler.js';
import * as companionService from './companion.service.js';

/**
 * GET /api/companions/me
 * Returns the authenticated user's companion, or null if none exists yet.
 */
export const getMyCompanion = asyncHandler(async (req, res) => {
    const companion = await companionService.getCompanionForUser(req.user.id);
    res.status(200).json({ data: companion });
});

/**
 * PUT /api/companions/me
 * Creates or updates the authenticated user's companion (species + name).
 * Used during onboarding when the user picks and names their companion.
 */
export const selectMyCompanion = asyncHandler(async (req, res) => {
    const companion = await companionService.selectCompanion(req.user.id, {
        type: req.body.type,
        name: req.body.name,
    });
    res.status(200).json({ data: companion });
});
