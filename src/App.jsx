import { Toaster } from 'sonner';
import { AppRoutes } from '@/routes/appRoutes';

function App() {
    return (
        <>
            <AppRoutes />
            <Toaster
                theme="dark"
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#1e1b3a',
                        border: '1px solid rgba(192, 132, 252, 0.4)',
                        color: '#ffffff',
                    },
                    classNames: {
                        actionButton: 'bg-howly-primary! text-white!',
                    },
                }}
            />
        </>
    );
}

export default App;