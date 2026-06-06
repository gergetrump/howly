import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../../config.js';
import User from '../users/user.model.js';
import { sendPasswordResetEmail } from '../mail/mail.service.js';

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


function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordReset(email) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
        email: normalizedEmail,
        isDeleted: false,
    });

    // Do not reveal whether the email exists.
    if (!user) {
        return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = hashToken(resetToken);

    user.passwordResetTokenHash = resetTokenHash;
    user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    const resetLink = `${config.frontendBaseUrl}/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail(user.email, resetLink);
}

export async function resetPassword(token, newPassword) {
    const tokenHash = hashToken(token);

    const user = await User.findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
        isDeleted: false,
    }).select('+passwordHash');

    if (!user) {
        return { error: 'Invalid or expired reset token' };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    user.passwordHash = passwordHash;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;

    await user.save();

    return { user };
}
