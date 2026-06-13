import Companion, { COMPANION_TYPES } from './companion.model.js';
import { ApiError } from '../../errors/ApiError.js';

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Maps a Companion document returned by the API.
 */
function toCompanionDto(companion) {
    if (!companion) {
        return null;
    }

    return {
        id: companion._id.toString(),
        name: companion.name,
        type: companion.type,
        inventorySize: companion.inventorySize,
    };
}

// ─── Service functions ──────────────────────────────────────────────

/**
 * Returns the user's companion, or null.
 */
export async function getCompanionForUser(userId) {
    const companion = await Companion.findOne({ user: userId });
    return toCompanionDto(companion);
}

/**
 * Creates or updates the user's companion (one per user).
 *
 * Used during onboarding when the user picks a species and names it, and is
 * safe to reuse later for switching/renaming the companion.
 */
export async function selectCompanion(userId, { type, name } = {}) {
    if (!COMPANION_TYPES.includes(type)) {
        throw ApiError.badRequest(
            `Companion type must be one of: ${COMPANION_TYPES.join(', ')}.`,
        );
    }

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
        throw ApiError.badRequest('Companion name is required.');
    }
    if (trimmedName.length > 30) {
        throw ApiError.badRequest('Companion name must be 30 characters or less.');
    }

    // One companion per user (unique index on `user`), so upsert keeps the
    // flow idempotent whether the user is creating or changing their companion.
    const companion = await Companion.findOneAndUpdate(
        { user: userId },
        { $set: { type, name: trimmedName } },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
            runValidators: true,
        },
    );

    return toCompanionDto(companion);
}
