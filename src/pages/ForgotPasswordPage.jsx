import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';

import howlyIcon from '@/assets/howly.png';
import { Background } from '@/components/brand/Background.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { appCardClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';
import { forgotPassword } from '@/services/authService';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        setMessage('');
        setError('');

        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedEmail) {
            setError('Email is required.');
            return;
        }

        if (!EMAIL_PATTERN.test(trimmedEmail)) {
            setError('Enter a valid email address.');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await forgotPassword(trimmedEmail);

            setMessage(
                response.message ||
                    'If an account with this email exists, a password reset link has been sent.',
            );
        } catch (error) {
            setError(error.message || 'Could not request password reset');
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
                                <KeyRound
                                    className="size-7 text-howly-primary"
                                    aria-hidden="true"
                                />
                            </div>

                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-howly-primary">
                                Password reset
                            </p>

                            <h1 className="text-3xl font-bold tracking-tight text-theme-text">
                                Forgot your password?
                            </h1>

                            <p className="mt-2 text-sm leading-relaxed text-theme-text-muted">
                                Enter your email address and we will send you a reset link.
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
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    aria-required="true"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    className="w-full rounded-xl border border-theme-text/20 bg-theme-surface/70 px-4 py-3 text-sm text-theme-text placeholder:text-theme-text-muted outline-none transition-colors focus:border-howly-primary"
                                />
                            </div>

                            {message && (
                                <p className="rounded-xl border border-theme-success/30 bg-theme-success/10 px-4 py-3 text-sm text-theme-success">
                                    {message}
                                </p>
                            )}

                            {error && (
                                <p className="rounded-xl border border-theme-danger/30 bg-theme-danger/10 px-4 py-3 text-sm text-theme-danger">
                                    {error}
                                </p>
                            )}

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-12 w-full rounded-full bg-howly-primary text-base font-semibold text-theme-text shadow-lg transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? 'Sending...' : 'Send reset link'}
                            </Button>
                        </form>

                        <p className="mt-6 text-center text-sm text-theme-text-muted">
                            Remember your password?{' '}
                            <Link
                                to="/login"
                                className="font-semibold text-howly-primary transition-colors hover:text-theme-love"
                            >
                                Back to login
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </main>
        </Background>
    );
}
