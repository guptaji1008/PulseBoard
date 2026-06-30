import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { pubClient, subClient } from '../config/redis';
import { env } from '../config/env';
import { JwtPayload } from '../middleware/auth';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigin },
  });

  io.adapter(createAdapter(pubClient, subClient));

  // Authenticate every socket connection via cookie (browser) or auth.token (non-browser clients).
  io.use((socket, next) => {
    let token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      const cookieHeader = socket.handshake.headers.cookie ?? '';
      const match = cookieHeader.split(';').find((c) => c.trim().startsWith('token='));
      token = match?.trim().slice('token='.length);
    }
    if (!token) return next(new Error('Unauthorized'));
    try {
      const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    socket.on('project:join', (projectId: string) => {
      socket.join(`project:${projectId}`);
    });
    socket.on('project:leave', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });
  });

  return io;
}

/** Broadcast an event to everyone currently viewing a project's board. */
export function emitToProject(projectId: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, payload);
}
