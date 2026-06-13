import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser } from '@/services/userService';
import { getMyCompanion } from '@/services/companionService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [companion, setCompanion] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    async function refreshUser() {
        const token = localStorage.getItem('howly_token');

        if (!token) {
            setUser(null);
            setCompanion(null);
            setIsLoadingUser(false);
            return;
        }

        try {
            setIsLoadingUser(true);
            const currentUser = await getCurrentUser();
            setUser(currentUser.user ?? currentUser);

            // Best-effort: load the chosen companion so it can be shown across the
            // app. A missing or failed companion must never block sign-in.
            try {
                const companionResponse = await getMyCompanion();
                setCompanion(companionResponse?.data ?? null);
            } catch (companionError) {
                console.error('Failed to fetch companion:', companionError);
                setCompanion(null);
            }
        } catch (error) {
            console.error('Failed to fetch current user:', error);
            setUser(null);
            setCompanion(null);
        } finally {
            setIsLoadingUser(false);
        }
    }

    useEffect(() => {
        refreshUser();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                companion,
                setCompanion,
                isLoadingUser,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside an AuthProvider');
    }

    return context;
}
