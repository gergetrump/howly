import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
    handleConfirmCheckoutSession,
    handleCreateCheckoutSession,
    handleCreateManagePremiumSession,
} from './payment.controller.js';


const router = Router();

router.use(requireAuth);

router.post('/create-checkout-session', handleCreateCheckoutSession);
router.post('/confirm-checkout-session', handleConfirmCheckoutSession);
router.post('/manage-premium-session', handleCreateManagePremiumSession);

export default router;
