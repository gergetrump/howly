import { Router } from 'express';
import {
    deleteCurrentUser,
    getCurrentUser,
    searchUsers,
    updateCurrentUser,
} from './user.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/search', searchUsers);
router.get('/me', getCurrentUser);
router.patch('/me', updateCurrentUser);
router.delete('/me', deleteCurrentUser);

export default router;
