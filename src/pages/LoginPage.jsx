import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';

import howlyIcon from '@/assets/howly.png';
import { Background } from '@/components/brand/Background.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { appCardClassName } from '@/components/cards/cardStyles';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { loginUser, resendVerificationEmail } from '@/services/authService';

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { refreshUser } = useAuth();

    const [formData, setFormData] = useState({
        identifier: '',
        password: '',
    });

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!location.state) {
            return;
        }

        const { message: nextMessage, email } = location.state;

        if (nextMessage) {
            setMessage(nextMessage);
        }

        if (email) {
            setFormData((currentData) => ({
                ...currentData,
                identifier: email,
            }));
        }

        navigate(location.pathname, { replace: true, state: null });
    }, [location, navigate]);

    function handleChange(event) {
        const { name, value } = event.target;

        setFormData((currentData) => ({
            ...currentData,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError('');
        setMessage('');

        if (!formData.identifier.trim()) {
            setError('Email or username is required.');
            return;
        }

        if (!formData.password) {
            setError('Password is required.');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await loginUser(formData);
            const token = response?.token ?? response?.accessToken ?? response?.data?.token;

            if (!token) {
                throw new Error('Login response did not include an access token');
            }

            localStorage.setItem('howly_token', token);
            await refreshUser();

            navigate('/dashboard');
        } catch (error) {
            const errMessage = (error?.message || '').toString().toLowerCase();
            const isNotVerified =
                error?.code === 'EMAIL_NOT_VERIFIED' ||
                errMessage.includes('not verified') ||
                errMessage.includes('email address has not been verified') ||
                errMessage.includes('verify your email') ||
                errMessage.includes('email not verified');

            if (isNotVerified) {
                try {
                    await resendVerificationEmail(formData.identifier);

                    setError('');
                    setMessage(
                        'Your email address is not verified yet. We sent you a new confirmation link.',
                    );
                } catch (sendErr) {
                    setError(
                        sendErr?.message ||
                        'Your email address is not verified yet, but we could not send a new confirmation email.',
                    );
                }

                return;
            }

            setError(error?.message || 'Login failed');
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
                    <Link to="/register">Sign up</Link>
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
                                <LogIn
                                    className="size-7 text-howly-primary"
                                    aria-hidden="true"
                                />
                            </div>

                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-howly-primary">
                                Welcome back
                            </p>

                            <h1 className="text-3xl font-bold tracking-tight text-theme-text">
                                Log in to Howly
                            </h1>

                            <p className="mt-2 text-sm leading-relaxed text-theme-text-muted">
                                Continue building your habits with your cosmic companion.
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
                                    htmlFor="identifier"
                                    className="text-sm font-medium text-theme-text"
                                >
                                    Email or username
                                </label>

                                <input
                                    id="identifier"
                                    name="identifier"
                                    type="text"
                                    value={formData.identifier}
                                    onChange={handleChange}
                                    aria-required="true"
                                    autoComplete="username"
                                    placeholder="you@example.com or username"
                                    className="w-full rounded-xl border border-theme-text/20 bg-theme-surface/70 px-4 py-3 text-sm text-theme-text placeholder:text-theme-text-muted outline-none transition-colors focus:border-howly-primary"
                                />
                            </div>

                            {message && (
                                <p className="rounded-xl border border-theme-success/30 bg-theme-success/10 px-4 py-3 text-sm text-theme-success">
                                    {message}
                                </p>
                            )}

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label
                                        htmlFor="password"
                                        className="text-sm font-medium text-theme-text"
                                    >
                                        Password
                                    </label>

                                    <Link
                                        to="/forgot-password"
                                        className="text-sm font-medium text-howly-primary transition-colors hover:text-theme-love"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>

                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={handleChange}
                                        aria-required="true"
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
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
                                <p className="rounded-xl border border-theme-danger/30 bg-theme-danger/10 px-4 py-3 text-sm text-theme-danger">
                                    {error}
                                </p>
                            )}

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-12 w-full rounded-full bg-howly-primary text-base font-semibold text-theme-text shadow-lg transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? 'Logging in...' : 'Log in'}
                            </Button>
                        </form>

                        <p className="mt-6 text-center text-sm text-theme-text-muted">
                            No account yet?{' '}
                            <Link
                                to="/register"
                                className="font-semibold text-howly-primary transition-colors hover:text-theme-love"
                            >
                                Create one
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </main>
        </Background>
    );
}
