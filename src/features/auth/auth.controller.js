import {
    authenticateLocalUser,
    getUserById,
    registerLocalUser,
    resendEmailVerification,
    requestPasswordReset,
    signAccessToken,
    resetPassword as resetUserPassword,
    toPublicUser,
    verifyEmail as verifyUserEmail,
} from './auth.service.js';
import { validateLoginInput, validateRegisterInput } from './auth.validation.js';
import config from '../../../config.js';

const badRequest = (res, message) => res.status(400).json({ message });
const unauthorized = (res, message) => res.status(401).json({ message });
const forbidden = (res, message) => res.status(403).json({ message });

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderEmailVerificationPage({ success, title, heading, message, ctaText, ctaHref }) {
    const accent = success ? '#22c55e' : '#f59e0b';
    const glow = success ? 'rgba(34, 197, 94, 0.22)' : 'rgba(245, 158, 11, 0.22)';
    const icon = success ? '✓' : '!';
    const safeTitle = escapeHtml(title);
    const safeHeading = escapeHtml(heading);
    const safeMessage = escapeHtml(message);
    const safeCtaText = escapeHtml(ctaText);
    // This page is server-rendered HTML, so encode every interpolated value.
    // React escaping does not help here because the response bypasses React.
    const safeCtaHref = escapeHtml(ctaHref);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
</head>
<body style="margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:radial-gradient(circle at top, rgba(139,92,246,0.18), transparent 35%), linear-gradient(180deg, #0f172a 0%, #111827 100%); font-family:Arial, Helvetica, sans-serif; color:#e2e8f0;">
    <main style="width:min(92vw, 640px); padding:24px;">
        <section style="background:rgba(15,23,42,0.92); border:1px solid rgba(148,163,184,0.22); border-radius:28px; box-shadow:0 30px 80px rgba(0,0,0,0.42); overflow:hidden;">
            <div style="height:8px; background:linear-gradient(90deg, #8b5cf6, #ec4899, ${accent});"></div>
            <div style="padding:40px 32px 34px; text-align:center;">
                <div style="width:72px; height:72px; margin:0 auto 20px; border-radius:22px; display:flex; align-items:center; justify-content:center; font-size:34px; font-weight:800; color:${accent}; background:${glow}; box-shadow:0 18px 40px ${glow};">
                    ${icon}
                </div>
                <p style="margin:0 0 10px; font-size:12px; font-weight:700; letter-spacing:0.24em; text-transform:uppercase; color:#a78bfa;">
                    Howly account verification
                </p>
                <h1 style="margin:0; color:#ffffff; font-size:34px; line-height:1.15; letter-spacing:-0.04em;">
                    ${safeHeading}
                </h1>
                <p style="margin:18px auto 0; max-width:520px; font-size:17px; line-height:1.7; color:#cbd5e1;">
                    ${safeMessage}
                </p>
                <div style="margin-top:30px;">
                    <a href="${safeCtaHref}" style="display:inline-block; padding:14px 24px; border-radius:999px; background:linear-gradient(135deg, #8b5cf6, #ec4899); color:#ffffff; text-decoration:none; font-size:15px; font-weight:700; box-shadow:0 14px 30px rgba(236,72,153,0.25);">
                        ${safeCtaText}
                    </a>
                </div>
            </div>
        </section>
    </main>
</body>
</html>`;
}

function sendVerificationHtml(res, { success, message }) {
    const appUrl = config.frontendBaseUrl || config.serverBaseUrl;
    const ctaHref = success ? `${appUrl}/login` : `${appUrl}/register`;
    const title = success ? 'Email verified' : 'Verification failed';
    const heading = success ? 'Email verified successfully' : 'Unable to verify email';
    const ctaText = success ? 'Continue to sign in' : 'Try again';

    return res
        .status(success ? 200 : 400)
        .type('html')
        .send(renderEmailVerificationPage({
            success,
            title,
            heading,
            message,
            ctaText,
            ctaHref,
        }));
}

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
        if (serviceError === 'Email address has not been verified') {
            return res.status(403).json({ message: serviceError });
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
        const wantsWebView = req.query.view === 'web';

        if (!token) {
            if (wantsWebView) {
                return sendVerificationHtml(res, {
                    success: false,
                    message: 'The verification link is missing a token.',
                });
            }

            return res.status(400).json({
                message: 'Verification token is required',
            });
        }

        const result = await verifyUserEmail(token);

        if (result.error) {
            if (wantsWebView) {
                return sendVerificationHtml(res, {
                    success: false,
                    message: result.error,
                });
            }

            return res.status(400).json({
                message: result.error,
            });
        }

        if (wantsWebView) {
            return sendVerificationHtml(res, {
                success: true,
                message: 'Your account is active now. You can return to Howly and sign in.',
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

export async function resendVerificationEmail(req, res) {
    try {
        const identifier = typeof req.body.identifier === 'string'
            ? req.body.identifier.trim()
            : typeof req.body.email === 'string'
                ? req.body.email.trim()
                : '';

        if (!identifier) {
            return res.status(400).json({
                message: 'Email or username is required',
            });
        }

        await resendEmailVerification(identifier);

        return res.status(200).json({
            message: 'If an account exists, a new verification link has been sent.',
        });
    } catch (error) {
        console.error('Resend verification email error:', error);

        return res.status(500).json({
            message: 'Something went wrong while sending the verification email',
        });
    }
}
