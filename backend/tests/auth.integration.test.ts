import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';

const app = createApp();

beforeAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.emailVerificationOtp.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Auth flow (integration)', () => {
  const creds = { name: 'Test User', email: 'test@example.com', password: 'secret123' };
  let cookie = '';
  let otp = '';

  it('registers a new user', async () => {
    const emailLog = jest.spyOn(console, 'info').mockImplementation(() => {});
    const res = await request(app).post('/api/auth/register').send(creds);
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(creds.email);
    expect(res.body.user.emailVerified).toBe(false);
    const message = emailLog.mock.calls[0]?.[0] ?? '';
    otp = message.match(/\b\d{6}\b/)?.[0] ?? '';
    emailLog.mockRestore();
    expect(otp).toHaveLength(6);
  });

  it('rejects duplicate registration', async () => {
    const res = await request(app).post('/api/auth/register').send(creds);
    expect(res.status).toBe(409);
  });

  it('blocks login until email is verified', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: creds.password });
    expect(res.status).toBe(403);
  });

  it('verifies email with the sent OTP', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ email: creds.email, otp });
    expect(res.status).toBe(200);
    expect(res.body.user.emailVerified).toBe(true);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: creds.password });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    const raw = res.headers['set-cookie'];
    cookie = Array.isArray(raw) ? raw.map((value) => value.split(';')[0]).join('; ') : '';
    expect(cookie).toContain('accessToken=');
    expect(cookie).toContain('refreshToken=');
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns the current user with a valid cookie', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(creds.email);
  });

  it('refreshes auth cookies', async () => {
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const raw = res.headers['set-cookie'];
    cookie = Array.isArray(raw) ? raw.map((value) => value.split(';')[0]).join('; ') : '';
    expect(cookie).toContain('accessToken=');
    expect(cookie).toContain('refreshToken=');
  });

  it('logs out and clears the refresh token', async () => {
    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const activeTokens = await prisma.refreshToken.count({ where: { revokedAt: null } });
    expect(activeTokens).toBe(0);
  });

  it('blocks access without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
