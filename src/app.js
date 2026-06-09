import express from 'express';
import cors from 'cors';
import path from 'path';
import habitRoutes from './features/habits/habit.routes.js';
import authRoutes from './features/auth/auth.routes.js';
import userRoutes from './features/users/user.routes.js';
import devRoutes from './features/dev/dev.routes.js';
import socialRoutes from './features/social/social.routes.js';
import itemRoutes from './features/items/item.routes.js';
import inventoryRoutes from './features/inventory/inventory.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import challengeRoutes from './features/challenges/challenge.routes.js';
import { handleStripeWebhook } from './payment/payment.controller.js';
import paymentRoutes from './payment/payment.routes.js';

// Build an Express app instance for both server and tests.
export default function createApp() {
    const app = express();

    app.use((req, res, next) => {
        const allowedOrigins = new Set([
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ]);
        const origin = req.headers.origin;

        if (allowedOrigins.has(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }

        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

        if (req.method === 'OPTIONS') {
            return res.status(204).send();
        }

        return next();
    });

    app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

    app.use(express.json());

    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

    app.get('/', (req, res) => {
        res.send('Backend is running');
    });

    app.use('/api/habits', habitRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/dev', devRoutes);
    app.use('/api/social', socialRoutes);
    app.use('/api/challenges', challengeRoutes);
    app.use('/api/items', itemRoutes);
    app.use('/api/inventory', inventoryRoutes);

    // Central error handling
    app.use(errorMiddleware);

    return app;
}
