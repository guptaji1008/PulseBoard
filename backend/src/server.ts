import http from 'http';
import { createApp } from './app';
import { initSocket } from './sockets';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { redis, pubClient, subClient } from './config/redis';
import {
  closeEmailNotificationQueue,
  startEmailNotificationWorker,
} from './modules/notifications/email.queue';

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);
  const emailNotificationWorker = startEmailNotificationWorker();
  let isShuttingDown = false;

  const shutdown = async (signal: string, exitCode = 0) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n${signal} received, shutting down...`);
    server.close();
    await Promise.allSettled([
      prisma.$disconnect(),
      redis.quit(),
      pubClient.quit(),
      subClient.quit(),
      emailNotificationWorker.close(),
      closeEmailNotificationQueue(),
    ]);
    process.exit(exitCode);
  };

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${env.port} is already in use. Stop the existing process or set PORT to another value.`);
      void shutdown('EADDRINUSE', 1);
      return;
    }

    console.error('Server error:', err.message);
    void shutdown('SERVER_ERROR', 1);
  });

  server.listen(env.port, () => {
    console.log(`API ready on http://localhost:${env.port}`);
    console.log(`Swagger docs on http://localhost:${env.port}/api/docs`);
  });

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
