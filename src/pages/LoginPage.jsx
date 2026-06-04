import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';

import howlyIcon from '@/assets/howly.png';
import { Background } from '@/components/brand/Background';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { appCardClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';
import { loginUser } from '@/services/authService';

export function LoginPage() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        setIsSubmitting(true);

        try {
            const response = await loginUser(formData);

            localStorage.setItem('howly_token', response.token);

            navigate('/dashboard');
        } catch (error) {
            setError(error.message || 'Login failed');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Background className="min-h-screen overflow-y-auto overflow-x-hidden">
            <nav className="relative z-20 flex items-center justify-between px-6 py-4 md:px-12 lg:px-20">
                <Link
                    to="/"
                    className="flex items-center gap-2 text-xl font-bold text-white transition-opacity hover:opacity-80"
                >
                    <img src={howlyIcon} alt="" className="size-8 object-contain" />
                    <span className="font-heading tracking-tight">Howly</span>
                </Link>

                <Button
                    variant="ghost"
                    className="text-slate-300 hover:text-white"
                    asChild
                >
                    <Link to="/register">Sign up</Link>
                </Button>
            </nav>

            <main className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center justify-center px-4 pb-12 pt-6 xs:px-6 md:px-12 lg:px-20">
                <Card
                    className={cn(
                        appCardClassName,
                        'w-full max-w-md border-slate-700/50 shadow-xl shadow-black/20',
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

                            <h1 className="text-3xl font-bold tracking-tight text-white">
                                Log in to Howly
                            </h1>

                            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                Continue building your habits with your cosmic companion.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label
                                    htmlFor="email"
                                    className="text-sm font-medium text-slate-200"
                                >
                                    Email
                                </label>

                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-howly-primary"
                                />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium text-slate-200"
                                >
                                    Password
                                </label>

                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-howly-primary"
                                />
                            </div>

                            {error && (
                                <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                    {error}
                                </p>
                            )}

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-12 w-full rounded-full bg-howly-primary text-base font-semibold text-white shadow-lg shadow-howly-primary/25 transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? 'Logging in...' : 'Log in'}
                            </Button>
                        </form>

                        <p className="mt-6 text-center text-sm text-slate-400">
                            No account yet?{' '}
                            <Link
                                to="/register"
                                className="font-semibold text-howly-primary transition-colors hover:text-pink-400"
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