import { Router } from 'express';
import { getItemById, listItems } from './item.controller.js';

const router = Router();

router.get('/', listItems);
router.get('/:itemId', getItemById);

export default router;
