// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { authValidation } from './auth.validation';
import { authRateLimiter } from '../../middleware/rate-limit.middleware';
import { UserRole } from '../../types/enums';

const router = Router();
const authController = new AuthController();

// Public routes
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
  ValidationMiddleware.validate(authValidation.refreshToken),
  authController.refreshToken
);

// Protected routes
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

router.post(
  '/cleanup-tokens',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN),
  authController.cleanupTokens
);

export default router;