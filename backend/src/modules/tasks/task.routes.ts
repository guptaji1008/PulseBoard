import { Router } from 'express';
import { taskController } from './task.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { createTaskSchema, updateTaskSchema } from './task.schema';

// Mounted at /api/projects/:projectId/tasks  -> create + list
export const projectTaskRouter = Router({ mergeParams: true });
projectTaskRouter.use(authenticate);
projectTaskRouter.post('/', validate(createTaskSchema), asyncHandler(taskController.create));
projectTaskRouter.get('/', asyncHandler(taskController.listByProject));

// Mounted at /api/tasks  -> update + delete a single task
export const taskRouter = Router();
taskRouter.use(authenticate);
taskRouter.patch('/:id', validate(updateTaskSchema), asyncHandler(taskController.update));
taskRouter.delete('/:id', asyncHandler(taskController.remove));
