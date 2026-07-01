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
                        closeButton: 'bg-[#1e1b3a]! border-white/25! text-white! hover:bg-[#2a2746]!',
                    },
                }}
            />
        </>
    );
}

export default App;