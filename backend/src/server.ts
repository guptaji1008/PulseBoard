import http from 'http';
import { createApp } from './app';
import { initSocket } from './sockets';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { redis, pubClient, subClient } from './config/redis';

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.port, () => {
    console.log(`API ready on http://localhost:${env.port}`);
    console.log(`Swagger docs on http://localhost:${env.port}/api/docs`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close();
    await Promise.allSettled([
      prisma.$disconnect(),
      redis.quit(),
      pubClient.quit(),
      subClient.quit(),
    ]);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
