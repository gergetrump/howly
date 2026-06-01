import express from 'express';
import habitRoutes from './features/habits/habit.routes.js';
import authRoutes from './features/auth/auth.routes.js';
import userRoutes from './features/users/user.routes.js';
import devRoutes from './features/dev/dev.routes.js';

// Build an Express app instance for both server and tests.
export default function createApp() {
    const app = express();

    app.use(express.json());

    app.get('/', (req, res) => {
        res.send('Backend is running');
    });

    app.use('/api/habits', habitRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/dev', devRoutes);

    return app;
}
