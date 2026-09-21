import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../../config.js';
import User from '../users/user.model.js';
import {
    sendAccountVerificationEmail,
    sendPasswordResetEmail,
} from '../mail/mail.service.js';

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

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function createEmailVerificationToken() {
    const token = crypto.randomBytes(32).toString('hex');

    return {
        token,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
}

function buildAccountVerificationLink(token) {
    return `${config.serverBaseUrl}/api/auth/verify-email?token=${token}&view=web`;
}

function buildLocalIdentifierQuery(identifier) {
    const trimmedIdentifier = identifier.trim();
    const normalizedEmail = trimmedIdentifier.toLowerCase();

    return {
        authProvider: 'local',
        $or: [
            { email: normalizedEmail },
            { username: trimmedIdentifier },
        ],
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
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail }).lean();

    if (existingUser) {
        return { error: 'Email is already in use' };
    }

    const { token: verificationToken, tokenHash: verificationTokenHash, expiresAt } =
        createEmailVerificationToken();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
        username,
        email: normalizedEmail,
        firstName,
        lastName,
        passwordHash,
        authProvider: 'local',
        isEmailVerified: false,
        emailVerificationTokenHash: verificationTokenHash,
        emailVerificationExpiresAt: expiresAt,
    });

    try {
        await sendAccountVerificationEmail(user.email, buildAccountVerificationLink(verificationToken));
    } catch (error) {
        await User.findByIdAndDelete(user._id);
        throw error;
    }

    return { user, verificationToken };
}

// Validate a local user's credentials and return the user or an error message.
export async function authenticateLocalUser({ identifier, password }) {
    const user = await User.findOne(buildLocalIdentifierQuery(identifier)).select('+passwordHash');

    if (!user) {
        return { error: 'Invalid email/username or password' };
    }

    if (user.isDeleted) {
        return { error: 'Account has been deleted' };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
        return { error: 'Invalid email/username or password' };
    }

    if (!user.isEmailVerified) {
        return {
            error: 'Email address has not been verified',
            statusCode: 403,
        };
    }

    return { user };
}

// Fetch a user for /me.
export async function getUserById(userId) {
    return User.findOne({ _id: userId, isDeleted: false });
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

export async function verifyEmail(token) {
    const tokenHash = hashToken(token);

    const user = await User.findOne({
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: { $gt: new Date() },
        isDeleted: false,
    });

    if (!user) {
        return { error: 'Invalid or expired verification token' };
    }

    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;

    await user.save();

    return { user };
}

export async function resendEmailVerification(identifier) {
    const user = await User.findOne({
        ...buildLocalIdentifierQuery(identifier),
        isDeleted: false,
    });

    if (!user || user.isEmailVerified) {
        return;
    }

    const { token, tokenHash, expiresAt } = createEmailVerificationToken();

    user.emailVerificationTokenHash = tokenHash;
    user.emailVerificationExpiresAt = expiresAt;

    await user.save();

    await sendAccountVerificationEmail(user.email, buildAccountVerificationLink(token));
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

    const passwordHash = await bcrypt.hash(newPassword, 12);

    user.passwordHash = passwordHash;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;

    await user.save();

    return { user };
}
