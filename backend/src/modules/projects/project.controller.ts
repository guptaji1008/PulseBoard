import { Request, Response } from 'express';
import { projectService } from './project.service';

export const projectController = {
  async create(req: Request, res: Response) {
    res.status(201).json(await projectService.create(req.user!.id, req.body));
  },
  async list(req: Request, res: Response) {
    res.json(await projectService.listForUser(req.user!.id));
  },
  async get(req: Request, res: Response) {
    res.json(await projectService.getById(req.user!.id, req.params.id));
  },
  async update(req: Request, res: Response) {
    res.json(await projectService.update(req.user!.id, req.params.id, req.body));
  },
  async remove(req: Request, res: Response) {
    await projectService.remove(req.user!.id, req.params.id);
    res.status(204).send();
  },
  async addMember(req: Request, res: Response) {
    res.status(201).json(await projectService.addMember(req.user!.id, req.params.id, req.body.email));
  },
};
