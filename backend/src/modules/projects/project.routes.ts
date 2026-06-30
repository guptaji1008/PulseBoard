import { Router } from 'express';
import { projectController } from './project.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { createProjectSchema, updateProjectSchema, addMemberSchema } from './project.schema';

const router = Router();
router.use(authenticate);

router.post('/', validate(createProjectSchema), asyncHandler(projectController.create));
router.get('/', asyncHandler(projectController.list));
router.get('/:id', asyncHandler(projectController.get));
router.patch('/:id', validate(updateProjectSchema), asyncHandler(projectController.update));
router.delete('/:id', asyncHandler(projectController.remove));
router.post('/:id/members', validate(addMemberSchema), asyncHandler(projectController.addMember));

export default router;
