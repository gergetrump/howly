import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
    getMyCompanion,
    selectMyCompanion,
} from './companion.controller.js';

const router = Router();

// All companion routes require authentication.
router.use(requireAuth);

router.get('/me', getMyCompanion);
router.put('/me', selectMyCompanion);

export default router;
