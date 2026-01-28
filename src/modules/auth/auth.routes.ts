// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { authValidation } from './auth.validation';
import { 
  authRateLimiter, 
  tokenRefreshLimiter, 
  passwordResetLimiter 
} from '../../middleware/rate-limit.middleware';
import { UserRole } from '../../types/enums';

const router = Router();
const authController = new AuthController();

// ✅ Public routes with appropriate rate limiting
router.post(
  '/register',
  authRateLimiter, // ✅ 15 attempts per 15 minutes
  ValidationMiddleware.validate(authValidation.register),
  authController.register
);

router.post(
  '/login',
  authRateLimiter, // ✅ 15 attempts per 15 minutes
  ValidationMiddleware.validate(authValidation.login),
  authController.login
);

// ✅ Token refresh with lenient rate limit
router.post(
  '/refresh-token',
  tokenRefreshLimiter, // ✅ 50 attempts per 15 minutes - very lenient
  ValidationMiddleware.validate(authValidation.refreshToken),
  authController.refreshToken
);

// ✅ Password reset routes with specific limiter
router.post(
  '/forgot-password',
  passwordResetLimiter, // ✅ 5 attempts per hour
  ValidationMiddleware.validate(authValidation.forgotPassword),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  passwordResetLimiter, // ✅ 5 attempts per hour
  ValidationMiddleware.validate(authValidation.resetPassword),
  authController.resetPassword
);

router.post(
  '/verify-reset-token',
  passwordResetLimiter, // ✅ 5 attempts per hour
  ValidationMiddleware.validate(authValidation.verifyResetToken),
  authController.verifyResetToken
);

// ✅ Protected routes - no rate limiting needed (auth middleware provides protection)
router.post(
  '/logout',
  AuthMiddleware.authenticate,
  authController.logout
);

router.post(
  '/change-password',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate(authValidation.changePassword),
  authController.changePassword
);

router.get(
  '/verify-email-service',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN),
  authController.verifyEmailService
);

router.get(
  '/profile',
  AuthMiddleware.authenticate,
  authController.getProfile
);

router.patch(
  '/profile',
  AuthMiddleware.authenticate,
  authController.updateProfile
);

// ✅ NEW: Theme preferences endpoint
router.put(
  '/theme',
  AuthMiddleware.authenticate,
  authController.updateTheme
);

// ✅ Admin routes
router.post(
  '/cleanup-tokens',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN),
  authController.cleanupTokens
);

router.post(
  '/admin/reset-user-password',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN),
  authController.adminResetUserPassword
);

export default router;