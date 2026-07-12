// src/pages/RegisterPage.jsx
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleAlert, Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';

import howlyIcon from '@/assets/howly.png';
import { Background } from '@/components/brand/Background.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { appCardClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';
import { checkUsername, registerUser } from '@/services/authService';
import { normalizeUsername, validateUsernameFormat } from '@/lib/usernameValidation';

const USERNAME_BLOCKED_MESSAGE = 'Username contains inappropriate language.';

const DISPLAY_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function normalizeInputText(value) {
    return typeof value === 'string' ? value.normalize('NFKC').trim() : '';
}

/* Validates the registration fields and returns the first error message, or '' if all are valid. */
function validateAccountFields(data) {
    const email = normalizeInputText(data.email).toLowerCase();
    const firstName = normalizeInputText(data.firstName);
    const lastName = normalizeInputText(data.lastName);
    const password = typeof data.password === 'string' ? data.password : '';

    const usernameError = validateUsernameFormat(data.username);

    if (usernameError) {
        return usernameError;
    }

    if (!firstName) {
        return 'First name is required.';
    }

    if (!DISPLAY_NAME_PATTERN.test(firstName)) {
        return 'First name may only contain letters, spaces, apostrophes, periods, or hyphens.';
    }

    if (!lastName) {
        return 'Last name is required.';
    }

    if (!DISPLAY_NAME_PATTERN.test(lastName)) {
        return 'Last name may only contain letters, spaces, apostrophes, periods, or hyphens.';
    }

    if (!email) {
        return 'Email is required.';
    }

    if (!EMAIL_PATTERN.test(email)) {
        return 'Enter a valid email address.';
    }

    if (!password) {
        return 'Password is required.';
    }

    if (password.length < 8) {
        return 'Password must be at least 8 characters.';
    }

    return '';
}

/* Registration page: validates the form (with async username checks) and creates the account. */
export function RegisterPage() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        password: '',
    });

    const [error, setError] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Bumped whenever the username changes or a new check starts, so a slow
    // in-flight server check can't overwrite the field with a stale result.
    const usernameCheckSeqRef = useRef(0);

    /* Updates a form field; when the username changes, cancels any pending availability check. */
    function handleChange(event) {
        const { name, value } = event.target;

        if (name === 'username') {
            // Any pending server check is now stale; drop its result when it lands.
            usernameCheckSeqRef.current += 1;
            setIsCheckingUsername(false);

            if (usernameError) {
                setUsernameError('');
            }
        }

        setFormData((previousData) => ({
            ...previousData,
            [name]: value,
        }));
    }

    // Asks the server whether the username is allowed (the blocklist lives there).
    // Fails open: a network hiccup never blocks signup — register re-validates anyway.
    async function isUsernameAllowedByServer(value) {
        try {
            const { valid } = await checkUsername(normalizeUsername(value));
            return valid;
        } catch {
            return true;
        }
    }

    /* On blur, runs the instant format check then asks the server whether the username is allowed. */
    async function handleUsernameBlur() {
        const value = formData.username;

        // Don't nag on a field the user hasn't filled in yet — submit still enforces "required".
        if (!value.trim()) {
            setUsernameError('');
            return;
        }

        // Instant, offline format check first — catches typos with no round-trip.
        const formatError = validateUsernameFormat(value);

        if (formatError) {
            setUsernameError(formatError);
            return;
        }

        // Format is fine — ask the server about the blocklist.
        const seq = (usernameCheckSeqRef.current += 1);
        setIsCheckingUsername(true);

        const allowed = await isUsernameAllowedByServer(value);

        // Ignore the result if the field changed or another check started meanwhile.
        if (seq !== usernameCheckSeqRef.current) {
            return;
        }

        setIsCheckingUsername(false);
        setUsernameError(allowed ? '' : USERNAME_BLOCKED_MESSAGE);
    }

    /* Validates the username and account fields, registers the user, then redirects to login. */
    async function handleSubmit(event) {
        event.preventDefault();

        setError('');

        const formatError = validateUsernameFormat(formData.username);

        if (formatError) {
            setUsernameError(formatError);
            return;
        }

        setIsSubmitting(true);

        // A pending blur check must not clobber the field while we submit.
        usernameCheckSeqRef.current += 1;
        setIsCheckingUsername(false);

        try {
            const usernameAllowed = await isUsernameAllowedByServer(formData.username);

            if (!usernameAllowed) {
                setUsernameError(USERNAME_BLOCKED_MESSAGE);
                return;
            }

            const validationError = validateAccountFields(formData);

            if (validationError) {
                setError(validationError);
                return;
            }

            const response = await registerUser({
                ...formData,
                username: normalizeInputText(formData.username),
                firstName: normalizeInputText(formData.firstName),
                lastName: normalizeInputText(formData.lastName),
                email: normalizeInputText(formData.email).toLowerCase(),
            });

            navigate('/login', {
                replace: true,
                state: {
                    message:
                        response.message ||
                        'Confirmation email sent. Check your inbox to verify your account.',
                    email: formData.email,
                },
            });
        } catch (error) {
            setError(error.message || 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Background className="min-h-screen overflow-y-auto overflow-x-hidden">
            <nav className="relative z-20 flex items-center justify-between px-6 py-4 md:px-12 lg:px-20">
                <Link
                    to="/"
                    className="flex items-center gap-2 text-xl font-bold text-theme-text transition-opacity hover:opacity-80"
                >
                    <img src={howlyIcon} alt="" className="size-8 object-contain" />
                    <span className="font-heading tracking-tight">Howly</span>
                </Link>

            </nav>

            <main className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center justify-center px-4 pb-12 pt-6 xs:px-6 md:px-12 lg:px-20">
                <Card
                    className={cn(
                        appCardClassName,
                        'w-full max-w-md border-theme-text/10 shadow-xl shadow-black/20',
                    )}
                >
                    <CardContent className="p-8">
                        <div className="mb-8 flex flex-col items-center text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-howly-primary/15">
                                <UserPlus
                                    className="size-7 text-howly-primary"
                                    aria-hidden="true"
                                />
                            </div>

                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-howly-primary">
                                Join the pack
                            </p>

                            <h1 className="text-3xl font-bold tracking-tight text-theme-text">
                                Create your account
                            </h1>

                            <p className="mt-2 text-sm leading-relaxed text-theme-text-muted">
                                Start tracking your habits with your cosmic companion.
                            </p>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            onInvalid={(event) => event.preventDefault()}
                            className="space-y-5"
                            noValidate
                        >
                            <div className="space-y-2">
                                <label
                                    htmlFor="username"
                                    className="text-sm font-medium text-theme-text"
                                >
                                    Username
                                </label>

                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={handleChange}
                                    onBlur={handleUsernameBlur}
                                    aria-required="true"
                                    aria-invalid={Boolean(usernameError)}
                                    aria-describedby={usernameError ? 'username-error' : undefined}
                                    maxLength={30}
                                    autoComplete="username"
                                    placeholder="howlyuser"
                                    className={cn(
                                        'w-full rounded-xl border border-theme-text/20 bg-theme-surface/70 px-4 py-3 text-sm text-theme-text placeholder:text-theme-text-muted outline-none transition-colors focus:border-howly-primary',
                                        usernameError && 'border-theme-danger focus:border-theme-danger',
                                    )}
                                />

                                {isCheckingUsername ? (
                                    <p className="flex items-center gap-1.5 text-xs text-theme-text-muted">
                                        <Loader2
                                            className="size-3.5 shrink-0 animate-spin"
                                            aria-hidden="true"
                                        />
                                        Checking username…
                                    </p>
                                ) : (
                                    usernameError && (
                                        <p
                                            id="username-error"
                                            className="flex items-center gap-1.5 text-xs text-theme-danger"
                                        >
                                            <CircleAlert
                                                className="size-3.5 shrink-0"
                                                aria-hidden="true"
                                            />
                                            {usernameError}
                                        </p>
                                    )
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="firstName"
                                        className="text-sm font-medium text-theme-text"
                                    >
                                        First name
                                    </label>

                                    <input
                                        id="firstName"
                                        name="firstName"
                                        type="text"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        aria-required="true"
                                        maxLength={50}
                                        autoComplete="given-name"
                                        placeholder="Alex"
                                        className="w-full rounded-xl border border-theme-text/20 bg-theme-surface/70 px-4 py-3 text-sm text-theme-text placeholder:text-theme-text-muted outline-none transition-colors focus:border-howly-primary"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="lastName"
                                        className="text-sm font-medium text-theme-text"
                                    >
                                        Last name
                                    </label>

                                    <input
                                        id="lastName"
                                        name="lastName"
                                        type="text"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        aria-required="true"
                                        maxLength={50}
                                        autoComplete="family-name"
                                        placeholder="Wolf"
                                        className="w-full rounded-xl border border-theme-text/20 bg-theme-surface/70 px-4 py-3 text-sm text-theme-text placeholder:text-theme-text-muted outline-none transition-colors focus:border-howly-primary"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="email"
                                    className="text-sm font-medium text-theme-text"
                                >
                                    Email
                                </label>

                                <input
                                    id="email"
                                    name="email"
                                    type="text"
                                    inputMode="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    aria-required="true"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    className="w-full rounded-xl border border-theme-text/20 bg-theme-surface/70 px-4 py-3 text-sm text-theme-text placeholder:text-theme-text-muted outline-none transition-colors focus:border-howly-primary"
                                />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium text-theme-text"
                                >
                                    Password
                                </label>

                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={handleChange}
                                        aria-required="true"
                                        autoComplete="new-password"
                                        placeholder="At least 8 characters"
                                        className="w-full rounded-xl border border-theme-text/20 bg-theme-surface/70 px-4 py-3 pr-12 text-sm text-theme-text placeholder:text-theme-text-muted outline-none transition-colors focus:border-howly-primary"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((isVisible) => !isVisible)}
                                        className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-theme-text-muted transition hover:bg-theme-text/10 hover:text-theme-text focus:outline-none focus:ring-2 focus:ring-howly-primary/40"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="size-4" aria-hidden="true" />
                                        ) : (
                                            <Eye className="size-4" aria-hidden="true" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div
                                    role="alert"
                                    className="flex items-start gap-3 rounded-xl border border-theme-danger/35 bg-theme-danger/10 px-4 py-3 text-sm text-theme-danger shadow-sm shadow-black/10"
                                >
                                    <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-12 w-full rounded-full bg-howly-primary text-base font-semibold text-theme-text shadow-lg transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? 'Creating account...' : 'Create account'}
                            </Button>
                        </form>

                        <p className="mt-6 text-center text-sm text-theme-text-muted">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="font-semibold text-howly-primary transition-colors hover:text-theme-love"
                            >
                                Log in
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </main>
        </Background>
    );
}
