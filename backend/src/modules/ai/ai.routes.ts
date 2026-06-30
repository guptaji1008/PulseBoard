import { Router } from 'express';
import { aiController } from './ai.controller';
import { authenticate } from '../../middleware/auth';
import { aiLimiter } from '../../middleware/rateLimit';
import { asyncHandler } from '../../utils/asyncHandler';

// Mounted at /api/projects -> POST /:projectId/summary
const router = Router();
router.post('/:projectId/summary', authenticate, aiLimiter, asyncHandler(aiController.summarize));

export default router;
