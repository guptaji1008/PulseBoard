import { Router } from 'express';
import { searchController } from './search.controller';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();
router.get('/', authenticate, asyncHandler(searchController.search));

export default router;
