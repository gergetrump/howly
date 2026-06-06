import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { buyItem, listMyInventory } from './inventory.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/me', listMyInventory);
router.post('/buy', buyItem);

export default router;
