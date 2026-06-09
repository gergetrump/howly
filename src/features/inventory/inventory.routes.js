import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { buyItem, equipItem, listMyInventory, unequipItem } from './inventory.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/me', listMyInventory);
router.post('/buy', buyItem);
router.post('/:userItemId/equip', equipItem);
router.delete('/:userItemId/equip', unequipItem);

export default router;
