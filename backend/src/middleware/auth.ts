import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface JwtPayload {
  id: string;
  email: string;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  // Prefer HttpOnly cookie; fall back to Bearer header (used by Socket.IO and non-browser clients)
  let token: string | undefined = req.cookies?.token;

  if (!token) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) token = header.slice(7);
  }

  if (!token) {
    throw new AppError(401, 'Not authenticated');
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }
}
