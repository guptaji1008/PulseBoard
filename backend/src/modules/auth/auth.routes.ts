import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  emailSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schema';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register));
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), asyncHandler(authController.verifyEmail));
router.post('/resend-verification', authLimiter, validate(emailSchema), asyncHandler(authController.resendVerificationOtp));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.post('/forgot-password', authLimiter, validate(emailSchema), asyncHandler(authController.forgotPassword));
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(authController.resetPassword));
router.get('/me', authenticate, asyncHandler(authController.me));
router.get('/socket-token', authenticate, asyncHandler(authController.socketToken));

export default router;
