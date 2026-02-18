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

// ─── PUBLIC ROUTES ───────────────────────────────────────────────────────────

router.post(
  '/register',
  authRateLimiter,
  ValidationMiddleware.validate(authValidation.register),
  authController.register
);

router.post(
  '/login',
  authRateLimiter,
  ValidationMiddleware.validate(authValidation.login),
  authController.login
);

router.post(
  '/refresh-token',
  tokenRefreshLimiter,
  ValidationMiddleware.validate(authValidation.refreshToken),
  authController.refreshToken
);

router.post(
  '/forgot-password',
  passwordResetLimiter,
  ValidationMiddleware.validate(authValidation.forgotPassword),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  passwordResetLimiter,
  ValidationMiddleware.validate(authValidation.resetPassword),
  authController.resetPassword
);

router.post(
  '/verify-reset-token',
  passwordResetLimiter,
  ValidationMiddleware.validate(authValidation.verifyResetToken),
  authController.verifyResetToken
);

// ─── PROTECTED ROUTES ────────────────────────────────────────────────────────

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
  '/profile',
  AuthMiddleware.authenticate,
  authController.getProfile
);

router.patch(
  '/profile',
  AuthMiddleware.authenticate,
  authController.updateProfile
);

router.put(
  '/theme',
  AuthMiddleware.authenticate,
  authController.updateTheme
);

// ─── SUPER ADMIN ONLY ROUTES ─────────────────────────────────────────────────

router.get(
  '/verify-email-service',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN),
  authController.verifyEmailService
);

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

// ─── USER MANAGEMENT ROUTES (SUPER_ADMIN + COMPANY_ADMIN) ───────────────────

// Manually suspend a user account — invalidates all their tokens immediately
router.post(
  '/users/suspend',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  authController.suspendUser
);

// Manually reactivate a suspended user account
router.post(
  '/users/reactivate',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  authController.reactivateUser
);

// Get a specific user's active/inactive status
router.get(
  '/users/:userId/status',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  authController.getUserStatus
);

export default router;