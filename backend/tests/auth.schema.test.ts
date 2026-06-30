import { registerSchema, loginSchema } from '../src/modules/auth/auth.schema';

describe('auth schemas (unit)', () => {
  it('accepts a valid registration', () => {
    const result = registerSchema.safeParse({
      name: 'Aman',
      email: 'aman@example.com',
      password: 'secret123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a short password', () => {
    const result = registerSchema.safeParse({
      name: 'Aman',
      email: 'aman@example.com',
      password: '123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({ name: 'Aman', email: 'nope', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('requires a password on login', () => {
    const result = loginSchema.safeParse({ email: 'aman@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});
