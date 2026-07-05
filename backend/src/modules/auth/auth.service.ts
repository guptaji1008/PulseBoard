import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth.schema';
import { emailService } from './email.service';

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

type AuthUser = { id: string; name: string; email: string; emailVerified: boolean; createdAt: Date };

function parseDurationMs(str: string): number {
  const match = /^(\d+)([smhd])$/.exec(str);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return n * multipliers[match[2]];
}

function signAccessToken(user: { id: string; email: string }): string {
  return jwt.sign({ id: user.id, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as unknown as jwt.SignOptions['expiresIn'],
  });
}

function generateOtp(): string {
  return crypto.randomInt(100000, 1_000_000).toString();
}

function generateOpaqueToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

function hashOpaqueToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function publicUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

async function createEmailOtp(userId: string, email: string) {
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);

  await prisma.$transaction([
    prisma.emailVerificationOtp.deleteMany({ where: { userId } }),
    prisma.emailVerificationOtp.create({
      data: {
        userId,
        otpHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    }),
  ]);

  await emailService.sendEmailVerificationOtp(email, otp);
}

async function createSession(user: { id: string; email: string }) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateOpaqueToken();
  const refreshTokenHash = hashOpaqueToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + parseDurationMs(env.jwtRefreshExpiresIn)),
    },
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError(409, 'Email already registered');

    const password = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, password },
      select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
    });

    await createEmailOtp(user.id, user.email);

    return { user: publicUser(user), message: 'Account created. Please verify your email.' };
  },

  async resendVerificationOtp(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError(404, 'User not found');
    if (user.emailVerified) throw new AppError(409, 'Email is already verified');

    await createEmailOtp(user.id, user.email);
    return { message: 'Verification OTP sent' };
  },

  async verifyEmail(input: VerifyEmailInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
    });
    if (!user) throw new AppError(404, 'User not found');
    if (user.emailVerified) return { user: publicUser(user), message: 'Email already verified' };

    const otpRecord = await prisma.emailVerificationOtp.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!otpRecord || otpRecord.expiresAt <= new Date()) {
      throw new AppError(400, 'Verification OTP is invalid or expired');
    }

    const valid = await bcrypt.compare(input.otp, otpRecord.otpHash);
    if (!valid) throw new AppError(400, 'Verification OTP is invalid or expired');

    const verifiedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
        select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
      });
      await tx.emailVerificationOtp.deleteMany({ where: { userId: user.id } });
      return updated;
    });

    return { user: publicUser(verifiedUser), message: 'Email verified successfully' };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new AppError(401, 'Invalid credentials');

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) throw new AppError(401, 'Invalid credentials');
    if (!user.emailVerified) throw new AppError(403, 'Please verify your email before logging in');

    const tokens = await createSession(user);
    return {
      user: publicUser(user),
      ...tokens,
    };
  },

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new AppError(401, 'Refresh token is required');

    const tokenHash = hashOpaqueToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }
    if (!stored.user.emailVerified) throw new AppError(403, 'Email is not verified');

    const tokens = await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      const nextRefreshToken = generateOpaqueToken();
      await tx.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: hashOpaqueToken(nextRefreshToken),
          expiresAt: new Date(Date.now() + parseDurationMs(env.jwtRefreshExpiresIn)),
        },
      });

      return {
        accessToken: signAccessToken(stored.user),
        refreshToken: nextRefreshToken,
      };
    });

    return {
      user: publicUser(stored.user),
      ...tokens,
    };
  },

  async logout(refreshToken: string | undefined) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashOpaqueToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { message: 'Logged out successfully' };
  },

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (user) {
      const resetToken = generateOpaqueToken();
      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashOpaqueToken(resetToken),
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          },
        }),
      ]);

      const resetLink = `${env.appUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;
      await emailService.sendPasswordResetLink(user.email, resetLink);
    }

    return { message: 'If that email exists, a reset link has been sent.' };
  },

  async resetPassword(input: ResetPasswordInput) {
    const tokenHash = hashOpaqueToken(input.token);
    const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.expiresAt <= new Date()) {
      throw new AppError(400, 'Reset token is invalid or expired');
    }

    const password = await bcrypt.hash(input.password, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: stored.userId }, data: { password } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: stored.userId } }),
      prisma.refreshToken.deleteMany({ where: { userId: stored.userId } }),
    ]);

    return { message: 'Password reset successfully' };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
    });
    if (!user) throw new AppError(404, 'User not found');
    return publicUser(user);
  },
};
