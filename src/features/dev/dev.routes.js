import { Router } from 'express';
import { listUsers, restoreUser } from './dev.controller.js';

const router = Router();

// DEV-ONLY: temporary helper for local testing. Delete before production use.
router.get('/users', listUsers);
router.patch('/users/:id/restore', restoreUser);

export default router;
