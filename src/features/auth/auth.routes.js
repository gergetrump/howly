import { Router } from 'express';
import { getMe, login, logout, register, forgotPassword, resetPassword } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

// Auth endpoints for local JWT flow (mounted under /api/auth).
const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
