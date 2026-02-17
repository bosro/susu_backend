// src/modules/daily-summaries/daily-summaries.routes.ts
import { Router } from 'express';
import { DailySummariesController } from './daily-summaries.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { TenantMiddleware } from '../../middleware/tenant.middleware';
import { dailySummariesValidation } from './daily-summaries.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const dailySummariesController = new DailySummariesController();

// All routes require authentication
router.use(
  AuthMiddleware.authenticate,
  TenantMiddleware.validateCompanyAccess
);

// ⚠️ IMPORTANT: Specific routes MUST come before parameterized routes

// Generate summary
// ✅ FIXED: Removed TenantMiddleware.validateBranchAccess — that middleware reads
// branchId from the JWT token, which COMPANY_ADMIN doesn't have.
// Branch validation is now handled inside the controller based on user role:
//   - AGENT: branchId comes from JWT token
//   - COMPANY_ADMIN / SUPER_ADMIN: branchId comes from request body
router.post(
  '/generate',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.AGENT),
  ValidationMiddleware.validate(dailySummariesValidation.generateParams),
  dailySummariesController.generate
);

// Get stats — MUST be before /:id route
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

// Get by ID
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