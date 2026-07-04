import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
    buyItem,
    equipItem,
    listBoostPurchaseLimits,
    listMyInventory,
    saveOutfit,
    unequipItem,
    useInventoryItem,
} from './inventory.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/me', listMyInventory);
router.get('/boost-purchase-limits', listBoostPurchaseLimits);
router.post('/buy', buyItem);
router.put('/outfit', saveOutfit);
router.post('/:userItemId/use', useInventoryItem);
router.post('/:userItemId/equip', equipItem);
router.delete('/:userItemId/equip', unequipItem);

export default router;
