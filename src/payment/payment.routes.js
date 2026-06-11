import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
    handleCreateCheckoutSession,
    handleCreateManagePremiumSession,
} from './payment.controller.js';


const router = Router();

router.use(requireAuth);

router.post('/create-checkout-session', handleCreateCheckoutSession);
router.post('/manage-premium-session', handleCreateManagePremiumSession);

export default router;