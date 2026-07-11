import { Toaster } from 'sonner';
import { AppRoutes } from '@/routes/appRoutes';

/* Root component: renders the app routes and the global themed toast notifications. */
function App() {
    return (
        <>
            <AppRoutes />
            <Toaster
                position="top-right"
                closeButton
                toastOptions={{
                    style: {
                        background: 'var(--t-surface)',
                        border: '1px solid color-mix(in srgb, var(--t-accent) 35%, transparent)',
                        color: 'var(--t-text)',
                    },
                    classNames: {
                        title: 'text-theme-text!',
                        description: 'text-theme-text-soft! opacity-100!',
                        actionButton: 'bg-theme-accent! text-theme-on-accent!',
                        closeButton: 'bg-theme-surface! border-theme-text/25! text-theme-text! hover:bg-theme-surface-2!',
                    },
                }}
            />
        </>
    );
}

export default App;