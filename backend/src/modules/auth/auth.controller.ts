import { Request, Response } from "express";
import { authService } from "./auth.service";
import { env } from "../../config/env";
import jwt from 'jsonwebtoken';

function parseDurationMs(str: string): number {
  const match = /^(\d+)([smhd])$/.exec(str);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1]);
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return n * multipliers[match[2]];
}

const isProduction = env.nodeEnv === "production";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  maxAge: parseDurationMs(env.jwtExpiresIn),
};

export const authController = {
  async register(req: Request, res: Response) {
    const { user, token } = await authService.register(req.body);
    res.cookie("token", token, COOKIE_OPTIONS);
    res.status(201).json({ user });
  },
  async login(req: Request, res: Response) {
    const { user, token } = await authService.login(req.body);
    res.cookie("token", token, COOKIE_OPTIONS);
    res.json({ user });
  },
  async me(req: Request, res: Response) {
    res.json(await authService.me(req.user!.id));
  },
  async logout(_req: Request, res: Response) {
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });
    res.json({ message: "Logged out successfully" });
  },
  // auth.controller.ts
  async socketToken(req: Request, res: Response) {
    const token = jwt.sign(
      { id: req.user!.id, email: req.user!.email },
      env.jwtSecret,
      { expiresIn: "1h" }
    );
    res.json({ token });
  },
};
