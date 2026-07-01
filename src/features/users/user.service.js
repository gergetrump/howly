import User from './user.model.js';
import config from '../../../config.js';

const SERVER_BASE_URL = config.serverBaseUrl ?? 'http://localhost:3000';

const DEFAULT_NOTIFICATION_PREFERENCES = {
    emailEnabled: true,
    challengeInvitations: true,
    streakReminders: true,
};

function normalizeNotificationPreferences(preferences = {}) {
    return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...Object.fromEntries(
            Object.entries(preferences ?? {}).filter(([, value]) => typeof value === 'boolean')
        ),
    };
}

// Fetch a user document by id.
export async function getUserById(userId) {
    return User.findById(userId);
}

export async function listDevUsers() {
    const users = await User.find({})
        .select('username email firstName lastName authProvider isDeleted createdAt updatedAt')
        .sort({ createdAt: -1 })
        .lean();

    return users.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        authProvider: user.authProvider,
        isDeleted: user.isDeleted,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    }));
}

export async function searchUsersByUsername({ query, currentUserId, limit = 10 }) {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
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
    const targetUser = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') }, isDeleted: false });
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

// Strip sensitive fields before sending user data to clients
export function toPublicUser(user) {
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
        streakShields: user.streakShields ?? 0,
        streakRepairDeadline: user.streakRepairDeadline ?? null,
        notificationPreferences: normalizeNotificationPreferences(user.notificationPreferences),
        premiumStatus: user.premiumStatus,
        premiumUntil: user.premiumUntil,
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

export async function restoreUser(userId) {
    return User.findByIdAndUpdate(
        userId,
        {
            isDeleted: false,
            deletedAt: null,
        },
        { returnDocument: 'after' }
    );
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
