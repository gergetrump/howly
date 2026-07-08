// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleAlert, UserPlus } from 'lucide-react';

import howlyIcon from '@/assets/howly.png';
import { Background } from '@/components/brand/background';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { appCardClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';
import { registerUser } from '@/services/authService';

const USERNAME_PATTERN = /^[A-Za-z0-9_-]+$/;
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const RESERVED_USERNAMES = new Set([
    'admin',
    'administrator',
    'api',
    'howly',
    'moderator',
    'root',
    'support',
    'system',
]);

function normalizeInputText(value) {
    return typeof value === 'string' ? value.normalize('NFKC').trim() : '';
}

function validateAccountFields(data) {
    const username = normalizeInputText(data.username);
    const email = normalizeInputText(data.email).toLowerCase();
    const firstName = normalizeInputText(data.firstName);
    const lastName = normalizeInputText(data.lastName);
    const password = typeof data.password === 'string' ? data.password : '';

    if (!username) {
        return 'Username is required.';
    }

    if (username.length < 3 || username.length > 30) {
        return 'Username must be between 3 and 30 characters.';
    }

    if (!USERNAME_PATTERN.test(username)) {
        return 'Username may only contain letters, numbers, underscores, or hyphens.';
    }

    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
        return 'Username is reserved.';
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    function handleChange(event) {
        const { name, value } = event.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError('');
        setIsSubmitting(true);

        try {
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

                <Button
                    variant="ghost"
                    className="text-theme-text-soft hover:text-theme-text"
                    asChild
                >
                    <Link to="/login">Log in</Link>
                </Button>
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
                                    aria-required="true"
                                    maxLength={30}
                                    autoComplete="username"
                                    placeholder="howlyuser"
                                    className="w-full rounded-xl border border-theme-text/20 bg-theme-surface/70 px-4 py-3 text-sm text-theme-text placeholder:text-theme-text-muted outline-none transition-colors focus:border-howly-primary"
                                />
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

                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    aria-required="true"
                                    autoComplete="new-password"
                                    placeholder="At least 8 characters"
                                    className="w-full rounded-xl border border-theme-text/20 bg-theme-surface/70 px-4 py-3 text-sm text-theme-text placeholder:text-theme-text-muted outline-none transition-colors focus:border-howly-primary"
                                />
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
