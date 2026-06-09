import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createCheckoutSession } from './payment.controller.js';


const router = Router();

router.use(requireAuth)

router.post('/create-checkout-session', createCheckoutSession);

export default router;  