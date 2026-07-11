import { Router } from 'express';
import { listUsers } from './dev.controller.js';

const router = Router();

// DEV-ONLY: temporary helper for local testing. Delete before production use.
router.get('/users', listUsers);

export default router;
