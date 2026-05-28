import { Button } from '@/components/ui/button';

export function LandingPage() {
    return (
        <div className="space-y-6 text-center">
            <h1 className="text-5xl font-bold text-white">Howly</h1>
            <p className="text-lg text-slate-300">
                Build habits with your pack.
            </p>
            <Button>Get Started</Button>
        </div>
    );
}