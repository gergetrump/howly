import { Router } from 'express';
import { restoreUser } from './dev.controller.js';

const router = Router();

router.patch('/users/:id/restore', restoreUser);

export default router;