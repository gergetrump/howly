import { Router } from 'express';
import { createItem, getItemById, listItems } from './item.controller.js';

const router = Router();

router.get('/', listItems);

// DEV-ONLY: temporary helper to seed shop items. Replace with an admin route before production
router.post('/', createItem);
router.get('/:itemId', getItemById);

export default router;
