import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { sendFeedback } from './feedback.controller.js';

const router = Router();

router.use(requireAuth);

router.post('/', sendFeedback);

export default router;