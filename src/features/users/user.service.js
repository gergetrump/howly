import User from './user.model.js';

// Fetch a user document by id.
export async function getUserById(userId) {
    return User.findById(userId);
}

export async function searchUsersByUsername({ query, currentUserId, limit = 10 }) {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
        _id: { $ne: currentUserId },
        isDeleted: false,
        username: { $regex: escapedQuery, $options: 'i' },
    })
        .sort({ username: 1 })
        .limit(limit);

    return users.map(toPublicUser);
}

// Update a user by id while enforcing unique username/email.
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
        new: true,
        runValidators: true,
    });

    return { user };
}

// Strip sensitive fields before sending user data to clients.
export function toPublicUser(user) {
    if (!user) {
        return null;
    }

    return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        authProvider: user.authProvider,
        providerId: user.providerId,
        coins: user.coins,
        streak: user.streak,
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
        { new: true }
    );
}

export async function restoreUser(userId) {
    return User.findByIdAndUpdate(
        userId,
        {
            isDeleted: false,
            deletedAt: null,
        },
        { new: true }
    );
}
