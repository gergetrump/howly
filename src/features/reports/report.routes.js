import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { uploadReportAttachment } from '../../middleware/upload.middleware.js';
import { createReport } from './report.controller.js';

const router = Router();

router.use(requireAuth);

router.post('/', uploadReportAttachment.single('attachment'), createReport);

export default router;
