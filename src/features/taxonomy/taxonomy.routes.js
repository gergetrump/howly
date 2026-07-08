import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { listTaxonomyCategories } from './taxonomy.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/categories', listTaxonomyCategories);

export default router;
