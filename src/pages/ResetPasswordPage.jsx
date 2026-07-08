import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';

import howlyIcon from '@/assets/howly.png';
import { Background } from '@/components/brand/background';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { appCardClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';
import { resetPassword } from '@/services/authService';

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        setMessage('');
        setError('');

        if (!token) {
            setError('Reset token is missing.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await resetPassword(token, password);

            setMessage(response.message || 'Password reset successfully.');

            setTimeout(() => {
                navigate('/login');
            }, 1500);
        } catch (error) {
            setError(error.message || 'Could not reset password');
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
                                <KeyRound
                                    className="size-7 text-howly-primary"
                                    aria-hidden="true"
                                />
                            </div>

                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-howly-primary">
                                New password
                            </p>

                            <h1 className="text-3xl font-bold tracking-tight text-theme-text">
                                Reset your password
                            </h1>

                            <p className="mt-2 text-sm leading-relaxed text-theme-text-muted">
                                Choose a new password for your Howly account.
                            </p>
                        </div>

                        {!token && (
                            <p className="mb-5 rounded-xl border border-theme-danger/30 bg-theme-danger/10 px-4 py-3 text-sm text-theme-danger">
                                Reset token is missing. Please request a new password reset link.
                            </p>
                        )}

                        <form
                            onSubmit={handleSubmit}
                            onInvalid={(event) => event.preventDefault()}
                            className="space-y-5"
                            noValidate
                        >
                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium text-theme-text"
                                >
                                    New password
                                </label>

                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    aria-required="true"
                                    autoComplete="new-password"
                                    placeholder="At least 8 characters"
                                    className="w-full rounded-xl border border-theme-text/20 bg-theme-surface/70 px-4 py-3 text-sm text-theme-text placeholder:text-theme-text-muted outline-none transition-colors focus:border-howly-primary"
                                />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="confirmPassword"
                                    className="text-sm font-medium text-theme-text"
                                >
                                    Confirm password
                                </label>

                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) =>
                                        setConfirmPassword(event.target.value)
                                    }
                                    aria-required="true"
                                    autoComplete="new-password"
                                    placeholder="Repeat password"
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
                                disabled={isSubmitting || !token}
                                className="h-12 w-full rounded-full bg-howly-primary text-base font-semibold text-theme-text shadow-lg transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? 'Resetting...' : 'Reset password'}
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
