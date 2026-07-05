import { Job, Queue, Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { env } from '../../config/env';
import { emailService } from '../auth/email.service';

type ProjectCreatedJob = {
  type: 'project-created';
  to: string;
  projectName: string;
};

type ProjectMemberAddedJob = {
  type: 'project-member-added';
  to: string;
  recipientName: string;
  projectName: string;
  addedByName: string;
};

type TaskAssignedJob = {
  type: 'task-assigned';
  to: string;
  recipientName: string;
  taskTitle: string;
  projectName: string;
  assignedByName: string;
};

type TaskStatusChangedJob = {
  type: 'task-status-changed';
  to: string;
  recipientName: string;
  taskTitle: string;
  projectName: string;
  oldStatus: string;
  newStatus: string;
  changedByName: string;
};

export type EmailNotificationJob =
  | ProjectCreatedJob
  | ProjectMemberAddedJob
  | TaskAssignedJob
  | TaskStatusChangedJob;
type EmailNotificationJobName = EmailNotificationJob['type'];

const EMAIL_QUEUE_NAME = 'email-notifications';

let emailQueue: Queue<EmailNotificationJob, void, EmailNotificationJobName> | null = null;

type RedisClientWithErrors = {
  on(event: 'error', listener: (err: Error) => void): unknown;
};

function attachRedisErrorHandler(clientPromise: Promise<RedisClientWithErrors>, label: string) {
  void clientPromise
    .then((client) => {
      client.on('error', (err) => {
        console.error(`[email-queue:${label}] redis error:`, err.message || err.name);
      });
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message || err.name : String(err);
      console.error(`[email-queue:${label}] redis client error:`, message);
    });
}

function createRedisConnection(): ConnectionOptions {
  const url = new URL(env.redisUrl);
  const isTls = url.protocol === 'rediss:';

  return {
    host: url.hostname,
    port: url.port ? parseInt(url.port, 10) : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? parseInt(url.pathname.slice(1), 10) : undefined,
    tls: isTls ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

function getEmailQueue() {
  if (!emailQueue) {
    const queue = new Queue<EmailNotificationJob, void, EmailNotificationJobName>(EMAIL_QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });

    queue.on('error', (err) => {
      console.error('[email-queue] queue error:', err.message || err.name);
    });
    attachRedisErrorHandler(queue.client as Promise<RedisClientWithErrors>, 'queue');

    emailQueue = queue;
  }

  return emailQueue;
}

export async function enqueueEmailNotification(data: EmailNotificationJob) {
  if (env.nodeEnv === 'test') return;

  try {
    await getEmailQueue().add(data.type, data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[email-queue] failed to enqueue notification:', message);
  }
}

async function processEmailNotification(job: Job<EmailNotificationJob, void, EmailNotificationJobName>) {
  const data = job.data;

  switch (data.type) {
    case 'project-created':
      await emailService.sendProjectCreatedNotification(data.to, data.projectName);
      break;
    case 'project-member-added':
      await emailService.sendProjectMemberAddedNotification(
        data.to,
        data.recipientName,
        data.projectName,
        data.addedByName,
      );
      break;
    case 'task-assigned':
      await emailService.sendTaskAssignedNotification(
        data.to,
        data.recipientName,
        data.taskTitle,
        data.projectName,
        data.assignedByName,
      );
      break;
    case 'task-status-changed':
      await emailService.sendTaskStatusChangedNotification(
        data.to,
        data.recipientName,
        data.taskTitle,
        data.projectName,
        data.oldStatus,
        data.newStatus,
        data.changedByName,
      );
      break;
  }
}

export function startEmailNotificationWorker() {
  const worker = new Worker<EmailNotificationJob, void, EmailNotificationJobName>(
    EMAIL_QUEUE_NAME,
    processEmailNotification,
    {
      connection: createRedisConnection(),
      concurrency: 5,
    },
  );

  worker.on('completed', (job) => {
    console.info(`[email-queue] completed ${job.name} job ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[email-queue] failed ${job?.name ?? 'unknown'} job ${job?.id ?? 'unknown'}:`,
      err.message || err.name,
    );
  });

  worker.on('error', (err) => {
    console.error('[email-queue] worker error:', err.message || err.name);
  });
  attachRedisErrorHandler(worker.client as Promise<RedisClientWithErrors>, 'worker');

  return worker;
}

export async function closeEmailNotificationQueue() {
  const queue = emailQueue;
  if (!queue) return;

  await queue.close();
  emailQueue = null;
}
