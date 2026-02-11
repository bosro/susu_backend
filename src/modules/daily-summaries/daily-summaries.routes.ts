// src/modules/daily-summaries/daily-summaries.routes.ts
// ✅ NO RATE LIMITING - Protected by authentication middleware

import { Router } from 'express';
import { DailySummariesController } from './daily-summaries.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { TenantMiddleware } from '../../middleware/tenant.middleware';
import { dailySummariesValidation } from './daily-summaries.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const dailySummariesController = new DailySummariesController();

// All routes require authentication - NO rate limiting needed
router.use(
  AuthMiddleware.authenticate,
  TenantMiddleware.validateCompanyAccess
);

// ⚠️ IMPORTANT: Specific routes MUST come before parameterized routes
// Otherwise '/stats' will be interpreted as an ID

// Generate summary
router.post(
  '/generate',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.AGENT),
  TenantMiddleware.validateBranchAccess,
  ValidationMiddleware.validate(dailySummariesValidation.generateParams),
  dailySummariesController.generate
);

// Get stats - MUST be before /:id route
router.get(
  '/stats',
  ValidationMiddleware.validateQuery(dailySummariesValidation.query),
  dailySummariesController.getStats
);

// Get all summaries
router.get(
  '/',
  ValidationMiddleware.validateQuery(dailySummariesValidation.query),
  dailySummariesController.getAll
);

// Get by ID - comes after specific routes
router.get(
  '/:id',
  ValidationMiddleware.validateParams(dailySummariesValidation.params),
  dailySummariesController.getById
);

// Update summary
router.patch(
  '/:id',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(dailySummariesValidation.params),
  ValidationMiddleware.validate(dailySummariesValidation.update),
  dailySummariesController.update
);

// Lock summary
router.post(
  '/:id/lock',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(dailySummariesValidation.params),
  dailySummariesController.lock
);

// Unlock summary
router.post(
  '/:id/unlock',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(dailySummariesValidation.params),
  dailySummariesController.unlock
);

export default router;