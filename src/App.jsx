import { Button } from '@/components/ui/button';

function App() {
    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto flex max-w-4xl flex-col items-start gap-4 p-8">
                <h1 className="text-4xl font-bold text-white">
                    Howly
                </h1>

                <p className="text-slate-300">
                    Frontend setup with React, Tailwind and shadcn/ui.
                </p>

                <Button>
                    Test shadcn Button
                </Button>
            </div>
        </main>
    );
}

export default App;