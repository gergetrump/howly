import { createContext, useContext, useEffect, useState } from 'react';
import { updateUserPreferences } from '@/services/userApi';
import { useAuth } from '@/context/authContext';

export const THEMES = [
    {
        id: 'forest-dark',
        name: 'Forest Dark',
        emoji: '🌲',
        description: 'Deep, moody, and premium',
        preview: { bg: '#161623', card: '#252538', accent: '#a855f7', extra: '#34d399' },
    },
    {
        id: 'sakura-light',
        name: 'Sakura Light',
        emoji: '🌸',
        description: 'Spring morning, fresh and calm',
        preview: { bg: '#ffe3ee', card: '#ffffff', accent: '#ec4899', extra: '#16a34a' },
    },
    {
        id: 'sunset-warm',
        name: 'Sunset Warm',
        emoji: '🌅',
        description: 'Golden hour, cozy evening',
        preview: { bg: '#2a1a30', card: '#3a2433', accent: '#fb923c', extra: '#4ade80' },
    },
    {
        id: 'ocean-dark',
        name: 'Ocean Dark',
        emoji: '🌊',
        description: 'Calm midnight waters, focused',
        preview: { bg: '#0a1628', card: '#14283d', accent: '#38bdf8', extra: '#2dd4bf' },
    },
    {
        id: 'hogwarts-night',
        name: 'Hogwarts Night',
        emoji: '🏰',
        description: 'Candlelit castle after dark',
        preview: { bg: '#161d2e', card: '#202940', accent: '#e3b34a', extra: '#a83232' },
    },
];

const THEME_IDS = THEMES.map((theme) => theme.id);
const DEFAULT_THEME = 'forest-dark';
const STORAGE_KEY = 'howly_theme';

const ThemeContext = createContext(null);

function isValidTheme(theme) {
    return THEME_IDS.includes(theme);
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
}

function getStoredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isValidTheme(stored) ? stored : DEFAULT_THEME;
}

export function ThemeProvider({ children }) {
    const { user } = useAuth();
    // localStorage first for instant paint, backend sync follows
    const [theme, setThemeState] = useState(getStoredTheme);

    // Apply on mount and whenever the theme changes
    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    // Sync with the user profile once it loads (backend wins over localStorage)
    useEffect(() => {
        const serverTheme = user?.preferences?.theme;

        if (isValidTheme(serverTheme)) {
            setThemeState(serverTheme);
        }
    }, [user?.preferences?.theme]);

    async function setTheme(nextTheme) {
        if (!isValidTheme(nextTheme) || nextTheme === theme) {
            return;
        }

        // Switch instantly, persist in the background
        setThemeState(nextTheme);

        if (user) {
            try {
                await updateUserPreferences({ theme: nextTheme });
            } catch (error) {
                console.error('Failed to persist theme preference:', error);
            }
        }
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used inside a ThemeProvider');
    }

    return context;
}
