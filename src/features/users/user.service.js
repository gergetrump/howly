import User from './user.model.js';
import Item from '../items/item.model.js';
import UserItem from '../inventory/inventory.model.js';
import ChallengeParticipant from '../challenges/challengeParticipant.model.js';
import config from '../../../config.js';

const SERVER_BASE_URL = config.serverBaseUrl ?? 'http://localhost:3000';

// Themes that must be purchased in the shop before they can be selected.
export const PREMIUM_THEME_ASSET_KEYS = {
    'sakura-light': 'theme-sakura-light',
    'hogwarts-night': 'theme-hogwarts-night',
    'ocean-dark': 'theme-ocean-dark',
    'sunset-warm': 'theme-sunset-warm',
};

export async function userOwnsThemeForPreference(userId, themeId) {
    const assetKey = PREMIUM_THEME_ASSET_KEYS[themeId];
    if (!assetKey) return true;

    const item = await Item.findOne({ assetKey }).select('_id').lean();
    if (!item) return true;

    return Boolean(await UserItem.exists({ user: userId, item: item._id }));
}

const DEFAULT_NOTIFICATION_PREFERENCES = {
    emailEnabled: false,
    challengeInvitations: false,
    friendRequests: false,
    streakReminders: false,
    muteAll: false,
    muteTag: false,
    muteFriendRequest: false,
    muteComment: false,
    muteLike: false,
    muteReaction: false,
    muteChallengeInvitation: false,
};

function normalizeNotificationPreferences(preferences = {}) {
    return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...Object.fromEntries(
            Object.entries(preferences ?? {}).filter(([, value]) => typeof value === 'boolean')
        ),
    };
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Fetch a user document by id.
export async function getUserById(userId) {
    return User.findById(userId);
}

export async function getCompletedChallengeCount(userId) {
    const participations = await ChallengeParticipant.find({
        user: userId,
        status: { $nin: ['left', 'failed'] },
    })
        .select('challenge status daysCompleted')
        .populate('challenge', 'status endsAt')
        .lean();
    const now = new Date();

    return participations.filter((participation) => {
        const challenge = participation.challenge;

        if (!challenge || challenge.status === 'failed') {
            return false;
        }

        if (participation.status === 'completed') {
            return true;
        }

        const challengeEnded = challenge.status === 'completed'
            || (challenge.endsAt && challenge.endsAt <= now);

        return challengeEnded && participation.daysCompleted > 0;
    }).length;
}

export async function searchUsersByUsername({ query, currentUserId, limit = 10 }) {
    const escapedQuery = escapeRegex(query);
    
    // Find current user's blocked users
    const currentUser = await User.findById(currentUserId).lean();
    const blockedUserIds = currentUser?.blockedUsers || [];
    
    // Find users who have blocked the current user
    const usersWhoBlockedMe = await User.find({ blockedUsers: currentUserId }, '_id').lean();
    const excludeUserIds = [...blockedUserIds, ...usersWhoBlockedMe.map(u => u._id), currentUserId];

    const users = await User.find({
        _id: { $nin: excludeUserIds },
        isDeleted: false,
        username: { $regex: escapedQuery, $options: 'i' },
    })
        .sort({ username: 1 })
        .limit(limit);

    return users.map(toPublicUser);
}

export async function getUserByUsername({ username, currentUserId }) {
    const escapedUsername = escapeRegex(username);
    const targetUser = await User.findOne({ username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') }, isDeleted: false });
    if (!targetUser) {
        return { errorCode: 'USER_NOT_FOUND' };
    }

    const currentUser = await User.findById(currentUserId).select('blockedUsers').lean();
    const blockedByMe = currentUser?.blockedUsers?.some(id => id.toString() === targetUser._id.toString());
    const hasBlockedMe = targetUser.blockedUsers?.some(id => id.toString() === currentUserId.toString());
    if (blockedByMe || hasBlockedMe) {
        return { errorCode: 'BLOCKED' };
    }

    return { user: toPublicUser(targetUser) };
}

// Update a user by id while enforcing unique username/email
export async function updateUserById(userId, updates) {
    if (updates.email) {
        const existingEmail = await User.findOne({
            email: updates.email,
            _id: { $ne: userId },
        }).lean();

        if (existingEmail) {
            return { error: 'email is already in use' };
        }
    }

    if (updates.username) {
        const existingUsername = await User.findOne({
            username: updates.username,
            _id: { $ne: userId },
        }).lean();

        if (existingUsername) {
            return { error: 'username is already in use' };
        }
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
        returnDocument: 'after',
        runValidators: true,
    });

    return { user };
}

// Update user preferences (e.g. theme) using dot-notation updates
export async function updateUserPreferences(userId, updates) {
    const themeId = updates['preferences.theme'];
    if (themeId && !(await userOwnsThemeForPreference(userId, themeId))) {
        return { errorCode: 'THEME_LOCKED' };
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, {
        returnDocument: 'after',
        runValidators: true,
    });

    return { user };
}

// Strip sensitive fields before sending user data to clients
export function toPublicUser(user, extras = {}) {
    if (!user) {
        return null;
    }

    const profilePictureUrl = user.profilePictureUrl
        ? user.profilePictureUrl
        : `${SERVER_BASE_URL}/uploads/profile-pictures/default.png`;

    return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePictureUrl,
        role: user.role,
        isPremium: user.isPremium,
        onboardingCompleted: user.onboardingCompleted,
        authProvider: user.authProvider,
        providerId: user.providerId,
        coins: user.coins,
        streak: user.streak,
        ...(
            Number.isInteger(extras.completedChallenges)
                ? { completedChallenges: extras.completedChallenges }
                : {}
        ),
        streakShields: user.streakShields ?? 0,
        streakRepairDeadline: user.streakRepairDeadline ?? null,
        streakShieldAutoUsedAt: user.streakShieldAutoUsedAt ?? null,
        notificationPreferences: normalizeNotificationPreferences(user.notificationPreferences),
        ghostMode: user.ghostMode ?? false,
        premiumStatus: user.premiumStatus,
        premiumUntil: user.premiumUntil,
        preferences: {
            theme: user.preferences?.theme ?? 'forest-dark',
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

export async function softDeleteUser(userId) {
    return User.findByIdAndUpdate(
        userId,
        {
            isDeleted: true,
            deletedAt: new Date(),
        },
        { returnDocument: 'after' }
    );
}

export async function deleteUserById(userId) {
    return User.findByIdAndDelete(userId);
}

export async function updateUserProfilePicture(userId, profilePictureUrl) {
    return User.findByIdAndUpdate(
        userId,
        { profilePictureUrl },
        { returnDocument: 'after' }
    );
}

export async function resetUserProfilePicture(userId) {
    return User.findByIdAndUpdate(
        userId,
        { profilePictureUrl: null },
        { returnDocument: 'after' }
    );
}

export async function updateNotificationPreferences(userId, preferences) {
    const currentUser = await User.findById(userId).select('notificationPreferences');

    if (!currentUser) {
        return null;
    }

    currentUser.notificationPreferences = {
        ...normalizeNotificationPreferences(currentUser.notificationPreferences),
        ...preferences,
    };

    await currentUser.save();

    return User.findById(userId);
}

// Mark the authenticated user's onboarding flow as completed.
export async function completeOnboarding(userId) {
    return User.findByIdAndUpdate(
        userId,
        { onboardingCompleted: true },
        { returnDocument: 'after' }
    );
}
