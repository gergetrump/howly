import { Toaster } from 'sonner';
import { AppRoutes } from '@/routes/appRoutes';

function App() {
    return (
        <>
            <AppRoutes />
            <Toaster
                theme="dark"
                position="top-right"
                closeButton
                toastOptions={{
                    style: {
                        background: '#1e1b3a',
                        border: '1px solid rgba(192, 132, 252, 0.4)',
                        color: '#ffffff',
                    },
                    classNames: {
                        actionButton: 'bg-howly-primary! text-white!',
                        closeButton: 'bg-theme-surface! border-theme-text/25! text-theme-text! hover:bg-theme-surface-2!',
                    },
                }}
            />
        </>
    );
}

export default App;