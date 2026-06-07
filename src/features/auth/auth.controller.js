import {
    authenticateLocalUser,
    getUserById,
    registerLocalUser,
    requestPasswordReset,
    signAccessToken,
    resetPassword as resetUserPassword,
    toPublicUser,
    verifyEmail as verifyUserEmail,
} from './auth.service.js';
import { validateLoginInput, validateRegisterInput } from './auth.validation.js';

const badRequest = (res, message) => res.status(400).json({ message });
const unauthorized = (res, message) => res.status(401).json({ message });
const forbidden = (res, message) => res.status(403).json({ message });

// Register a new local user and send a confirmation email.
export async function register(req, res) {
    try {
        const { error, value } = validateRegisterInput(req.body);

        if (error) {
            return badRequest(res, error);
        }

        const { user, error: serviceError } = await registerLocalUser(value);

        if (serviceError) {
            return badRequest(res, serviceError);
        }

        return res.status(201).json({
            message: 'Confirmation email sent',
            user: toPublicUser(user),
        });
    } catch (error) {
        if (error.code === 11000) {
            const duplicatedField = Object.keys(error.keyValue)[0];
            return res.status(409).json({
                message: `${duplicatedField} is already in use`,
            })
        }
        return res.status(500).json({
            message: 'Something went wrong'
        })
    }
}

// Authenticate a local user and return an access token.
export async function login(req, res) {
    const { error, value } = validateLoginInput(req.body);

    if (error) {
        return badRequest(res, error);
    }

    const { user, error: serviceError } = await authenticateLocalUser(value);

    if (serviceError) {
        if (serviceError === 'email address has not been verified') {
            return forbidden(res, serviceError);
        }

        return unauthorized(res, serviceError);
    }

    const token = signAccessToken(user);

    return res.status(200).json({ user: toPublicUser(user), token });
}

// Return the current authenticated user.
export async function getMe(req, res) {
    const user = await getUserById(req.user.id);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(toPublicUser(user));
}

// Log out by instructing the client to discard its token.
export async function logout(req, res) {
    return res.status(204).send();
}


export async function forgotPassword(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: 'Email is required',
            });
        }

        await requestPasswordReset(email);

        return res.status(200).json({
            message:
                'If an account with this email exists, a password reset link has been sent to the registered email address.',
        });
    } catch (error) {
        console.error('Forgot password error:', error);

        return res.status(500).json({
            message: 'Something went wrong while requesting a password reset',
        });
    }
}

export async function resetPassword(req, res) {
    try {
        const { token, password } = req.body;

        if (!token) {
            return res.status(400).json({
                message: 'Reset token is required',
            });
        }

        if (!password || password.length < 8) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long',
            });
        }

        const result = await resetUserPassword(token, password);

        if (result.error) {
            return res.status(400).json({
                message: result.error,
            });
        }

        return res.status(200).json({
            message: 'Password reset successfully',
        });
    } catch (error) {
        console.error('Reset password error:', error);

        return res.status(500).json({
            message: 'Something went wrong while resetting the password',
        });
    }
}

export async function confirmEmail(req, res) {
    try {
        const token = req.query.token || req.body.token;

        if (!token) {
            return res.status(400).json({
                message: 'Verification token is required',
            });
        }

        const result = await verifyUserEmail(token);

        if (result.error) {
            return res.status(400).json({
                message: result.error,
            });
        }

        return res.status(200).json({
            message: 'Email verified successfully',
            user: toPublicUser(result.user),
        });
    } catch (error) {
        console.error('Confirm email error:', error);

        return res.status(500).json({
            message: 'Something went wrong while confirming the email address',
        });
    }
}