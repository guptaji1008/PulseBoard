import { Request, Response } from 'express';
import { aiService } from './ai.service';

export const aiController = {
  async summarize(req: Request, res: Response) {
    res.json(await aiService.summarizeProject(req.user!.id, req.params.projectId));
  },
};
