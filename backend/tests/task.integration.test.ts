import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';

const app = createApp();
let cookie = '';

beforeAll(async () => {
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Owner', email: 'owner@example.com', password: 'secret123' });
  const raw = res.headers['set-cookie'];
  cookie = (Array.isArray(raw) ? raw[0] : raw)?.split(';')[0] ?? '';
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Project and task flow (integration)', () => {
  let projectId = '';
  let taskId = '';

  it('creates a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', cookie)
      .send({ name: 'Website Redesign' });
    expect(res.status).toBe(201);
    projectId = res.body.id;
  });

  it('creates a task inside the project', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Cookie', cookie)
      .send({ title: 'Design login page', priority: 'HIGH' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Design login page');
    taskId = res.body.id;
  });

  it('updates the task status', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Cookie', cookie)
      .send({ status: 'IN_PROGRESS' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  });

  it('lists the project tasks', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/tasks`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('finds the task via full-text search', async () => {
    const res = await request(app)
      .get('/api/search?q=login')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  it('blocks a non-member from the project', async () => {
    const other = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Outsider', email: 'outsider@example.com', password: 'secret123' });
    const rawOther = other.headers['set-cookie'];
    const otherCookie = (Array.isArray(rawOther) ? rawOther[0] : rawOther)?.split(';')[0] ?? '';
    const res = await request(app)
      .get(`/api/projects/${projectId}/tasks`)
      .set('Cookie', otherCookie);
    expect(res.status).toBe(403);
  });
});
