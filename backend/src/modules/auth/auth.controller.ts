import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from './auth.service';
import { env } from '../../config/env';

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

const isProduction = env.nodeEnv === 'production';

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
};

const accessCookieOptions = {
  ...baseCookieOptions,
  maxAge: parseDurationMs(env.jwtExpiresIn),
};

const refreshCookieOptions = {
  ...baseCookieOptions,
  maxAge: parseDurationMs(env.jwtRefreshExpiresIn),
};

function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie('accessToken', tokens.accessToken, accessCookieOptions);
  res.cookie('refreshToken', tokens.refreshToken, refreshCookieOptions);
}

function clearAuthCookies(res: Response) {
  res.clearCookie('accessToken', baseCookieOptions);
  res.clearCookie('refreshToken', baseCookieOptions);
  res.clearCookie('token', baseCookieOptions);
}

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  },

  async resendVerificationOtp(req: Request, res: Response) {
    res.json(await authService.resendVerificationOtp(req.body.email));
  },

  async verifyEmail(req: Request, res: Response) {
    res.json(await authService.verifyEmail(req.body));
  },

  async login(req: Request, res: Response) {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    setAuthCookies(res, { accessToken, refreshToken });
    res.json({ user });
  },

  async refresh(req: Request, res: Response) {
    const { user, accessToken, refreshToken } = await authService.refresh(req.cookies?.refreshToken);
    setAuthCookies(res, { accessToken, refreshToken });
    res.json({ user });
  },

  async me(req: Request, res: Response) {
    res.json(await authService.me(req.user!.id));
  },

  async logout(req: Request, res: Response) {
    const result = await authService.logout(req.cookies?.refreshToken);
    clearAuthCookies(res);
    res.json(result);
  },

  async forgotPassword(req: Request, res: Response) {
    res.json(await authService.forgotPassword(req.body));
  },

  async resetPassword(req: Request, res: Response) {
    const result = await authService.resetPassword(req.body);
    clearAuthCookies(res);
    res.json(result);
  },

  async socketToken(req: Request, res: Response) {
    const token = jwt.sign(
      { id: req.user!.id, email: req.user!.email },
      env.jwtSecret,
      { expiresIn: '1h' },
    );
    res.json({ token });
  },
};
