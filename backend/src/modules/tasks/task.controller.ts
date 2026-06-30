import { Request, Response } from 'express';
import { taskService } from './task.service';

export const taskController = {
  async create(req: Request, res: Response) {
    res.status(201).json(await taskService.create(req.user!.id, req.params.projectId, req.body));
  },
  async listByProject(req: Request, res: Response) {
    res.json(await taskService.listByProject(req.user!.id, req.params.projectId));
  },
  async update(req: Request, res: Response) {
    res.json(await taskService.update(req.user!.id, req.params.id, req.body));
  },
  async remove(req: Request, res: Response) {
    await taskService.remove(req.user!.id, req.params.id);
    res.status(204).send();
  },
};
