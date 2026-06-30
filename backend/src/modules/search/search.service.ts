import { prisma } from '../../config/prisma';

export interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string;
  rank: number;
}

export const searchService = {
  /**
   * Full-text search over tasks the user can access, ranked by relevance.
   * Uses PostgreSQL to_tsvector / plainto_tsquery for proper text search.
   */
  async searchTasks(userId: string, query: string): Promise<SearchResult[]> {
    if (!query || !query.trim()) return [];

    return prisma.$queryRaw<SearchResult[]>`
      SELECT t.id, t.title, t.description, t.status::text, t.priority::text, t."projectId",
             ts_rank(
               to_tsvector('english', t.title || ' ' || coalesce(t.description, '')),
               plainto_tsquery('english', ${query})
             ) AS rank
      FROM "Task" t
      JOIN "ProjectMember" pm ON pm."projectId" = t."projectId"
      WHERE pm."userId" = ${userId}
        AND to_tsvector('english', t.title || ' ' || coalesce(t.description, ''))
            @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT 50;
    `;
  },
};
