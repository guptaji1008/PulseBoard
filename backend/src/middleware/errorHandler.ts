import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Prisma "record not found" on update/delete
  if (err.name === 'PrismaClientKnownRequestError' && (err as { code?: string }).code === 'P2025') {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  console.error('[error]', err);
  const message = env.nodeEnv === 'production' ? 'Internal server error' : err.message;
  res.status(500).json({ error: message });
}
