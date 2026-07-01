import { Toaster } from 'sonner';
import { AppRoutes } from '@/routes/appRoutes';

function App() {
    return (
        <>
            <AppRoutes />
            <Toaster theme="dark" position="bottom-center" />
        </>
    );
}

export default App;