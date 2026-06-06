import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../../config.js';
import User from '../users/user.model.js';

const TOKEN_EXPIRES_IN = config.jwtExpiresIn || '7d';

// Centralized lookup for the JWT secret.
function getJwtSecret() {
    const secret = config.jwtSecret;

    if (!secret) {
        throw new Error('jwtSecret is missing in config.js');
    }

    return secret;
}

// Keep token payload minimal and stable for future changes.
function buildTokenPayload(user) {
    return {
        sub: user._id.toString(),
        role: user.role,
    };
}

// Sign a new access token for the given user.
export function signAccessToken(user) {
    return jwt.sign(buildTokenPayload(user), getJwtSecret(), {
        expiresIn: TOKEN_EXPIRES_IN,
    });
}

// Register a local user, returning a created user or an error message.
export async function registerLocalUser({ username, email, firstName, lastName, password }) {
    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
        return { error: 'email is already in use' };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
        username,
        email,
        firstName,
        lastName,
        passwordHash,
        authProvider: 'local',
    });

    return { user };
}

// Validate a local user's credentials and return the user or an error message.
export async function authenticateLocalUser({ email, password }) {
    const user = await User.findOne({ email, authProvider: 'local' }).select('+passwordHash');

    if (!user) {
        return { error: 'invalid email or password' };
    }

    if (user.isDeleted) {
        return { error: 'account has been deleted' };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
        return { error: 'invalid email or password' };
    }

    return { user };
}

// Fetch a user for /me.
export async function getUserById(userId) {
    return User.findById(userId);
}

// Return only safe fields to send to the client.
export function toPublicUser(user) {
    if (!user) {
        return null;
    }

    return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        authProvider: user.authProvider,
        providerId: user.providerId,
        coins: user.coins,
        streak: user.streak,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
