import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';

import howlyIcon from '@/assets/howly.png';
import { Background } from '@/components/brand/background';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { appCardClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';
import { verifyEmail } from '@/services/authService';

export function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token');

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Verification token is missing.');
            return;
        }

        let isActive = true;

        async function confirm() {
            setIsVerifying(true);

            try {
                const response = await verifyEmail(token);

                if (!isActive) {
                    return;
                }

                setMessage(response.message || 'Email verified successfully.');

                window.setTimeout(() => {
                    navigate('/login', {
                        replace: true,
                        state: {
                            message:
                                'Email verified successfully. You can log in now.',
                        },
                    });
                }, 1500);
            } catch (error) {
                if (!isActive) {
                    return;
                }

                setError(error.message || 'Could not verify email');
            } finally {
                if (isActive) {
                    setIsVerifying(false);
                }
            }
        }

        confirm();

        return () => {
            isActive = false;
        };
    }, [navigate, token]);

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
                                <MailCheck
                                    className="size-7 text-howly-primary"
                                    aria-hidden="true"
                                />
                            </div>

                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-howly-primary">
                                Verify email
                            </p>

                            <h1 className="text-3xl font-bold tracking-tight text-theme-text">
                                Confirm your account
                            </h1>

                            <p className="mt-2 text-sm leading-relaxed text-theme-text-muted">
                                We are checking your verification link.
                            </p>
                        </div>

                        {isVerifying && (
                            <p className="rounded-xl border border-theme-text/20 bg-theme-surface/70 px-4 py-3 text-sm text-theme-text-soft">
                                Verifying your email address...
                            </p>
                        )}

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

                        <div className="mt-6 flex justify-center">
                            <Button
                                asChild
                                className="h-12 rounded-full bg-howly-primary text-base font-semibold text-theme-text shadow-lg transition-all hover:-translate-y-0.5 hover:opacity-90"
                            >
                                <Link to="/login">Go to login</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </Background>
    );
}