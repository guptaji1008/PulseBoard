import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const emailSchema = z.object({
  email: z.string().email('A valid email is required'),
});

export const verifyEmailSchema = z.object({
  email: z.string().email('A valid email is required'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6 digit code'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32, 'Reset token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof emailSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
