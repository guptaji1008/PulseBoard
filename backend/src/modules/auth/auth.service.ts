import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { RegisterInput, LoginInput } from './auth.schema';

function signToken(user: { id: string; email: string }): string {
  return jwt.sign({ id: user.id, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as unknown as jwt.SignOptions['expiresIn'],
  });
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError(409, 'Email already registered');

    const password = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, password },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    return { user, token: signToken(user) };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new AppError(401, 'Invalid credentials');

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    return {
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
      token: signToken(user),
    };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) throw new AppError(404, 'User not found');
    return user;
  },
};
