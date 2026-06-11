import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser } from '@/services/userService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    async function refreshUser() {
        const token = localStorage.getItem('howly_token');

        if (!token) {
            setUser(null);
            setIsLoadingUser(false);
            return;
        }

        try {
            setIsLoadingUser(true);
            const currentUser = await getCurrentUser();
            setUser(currentUser.user ?? currentUser);
        } catch (error) {
            console.error('Failed to fetch current user:', error);
            setUser(null);
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
