import { Request, Response } from 'express';
import { searchService } from './search.service';

export const searchController = {
  async search(req: Request, res: Response) {
    const query = (req.query.q as string) ?? '';
    const results = await searchService.searchTasks(req.user!.id, query);
    res.json({ query, count: results.length, results });
  },
};
