import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { projectService } from '../projects/project.service';

const CACHE_TTL_SECONDS = 600; // 10 minutes

interface TaskForSummary {
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  assignee: { name: string } | null;
}

export const aiService = {
  async summarizeProject(userId: string, projectId: string) {
    await projectService.assertMember(userId, projectId);

    const tasks = await prisma.task.findMany({
      where: { projectId },
      select: {
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignee: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (tasks.length === 0) {
      return { summary: 'This project has no tasks yet.', cached: false };
    }

    // Cache key is invalidated automatically when the task list changes.
    const fingerprint = crypto.createHash('sha1').update(JSON.stringify(tasks)).digest('hex');
    const cacheKey = `summary:${projectId}:${fingerprint}`;

    const cached = await redis.get(cacheKey);
    if (cached) return { summary: cached, cached: true };

    const summary = await this.generate(tasks);
    await redis.set(cacheKey, summary, 'EX', CACHE_TTL_SECONDS);
    return { summary, cached: false };
  },

  async generate(tasks: TaskForSummary[]): Promise<string> {
    const taskList = tasks
      .map(
        (t) =>
          `- [${t.status}] ${t.title} (priority ${t.priority}` +
          `${t.assignee ? `, assigned to ${t.assignee.name}` : ', unassigned'})`,
      )
      .join('\n');

    // Graceful fallback so the app runs fully even without a Groq API key.
    if (!env.groqApiKey) {
      const counts = tasks.reduce<Record<string, number>>((acc, t) => {
        acc[t.status] = (acc[t.status] ?? 0) + 1;
        return acc;
      }, {});
      return (
        `Project status (offline summary): ` +
        `${counts['TODO'] ?? 0} to do, ${counts['IN_PROGRESS'] ?? 0} in progress, ` +
        `${counts['DONE'] ?? 0} done. Set GROQ_API_KEY to enable AI-written summaries.`
      );
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify({
        model: env.groqModel,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'You are a concise project assistant. Write a short standup-style status summary ' +
              'in 4-5 lines, grouped by status. No preamble, no markdown headings.',
          },
          { role: 'user', content: `Here are the tasks:\n${taskList}` },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new AppError(502, `AI provider error (${response.status}): ${text.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? 'No summary produced.';
  },
};
