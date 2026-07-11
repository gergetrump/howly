import { Router } from 'express';
import {
    confirmEmail,
    getMe,
    login,
    logout,
    register,
    forgotPassword,
    resetPassword,
    resendVerificationEmail,
} from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

// Auth endpoints for local JWT flow (mounted under /api/auth).
const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', confirmEmail);
router.post('/verify-email', confirmEmail);
router.post('/resend-verification', resendVerificationEmail);
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
