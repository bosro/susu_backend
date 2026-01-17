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

router.post(
  '/generate',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.AGENT), // ✅ Added SUPER_ADMIN & COMPANY_ADMIN
  TenantMiddleware.validateBranchAccess,
  ValidationMiddleware.validate(dailySummariesValidation.generateParams),
  dailySummariesController.generate
);

router.get(
  '/',
  ValidationMiddleware.validateQuery(dailySummariesValidation.query),
  dailySummariesController.getAll
);

router.get(
  '/stats',
  ValidationMiddleware.validateQuery(dailySummariesValidation.query),
  dailySummariesController.getStats
);

router.get(
  '/:id',
  ValidationMiddleware.validateParams(dailySummariesValidation.params),
  dailySummariesController.getById
);

router.patch(
  '/:id',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN), // ✅ Added SUPER_ADMIN
  ValidationMiddleware.validateParams(dailySummariesValidation.params),
  ValidationMiddleware.validate(dailySummariesValidation.update),
  dailySummariesController.update
);

router.post(
  '/:id/lock',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN), // ✅ Added SUPER_ADMIN
  ValidationMiddleware.validateParams(dailySummariesValidation.params),
  dailySummariesController.lock
);

router.post(
  '/:id/unlock',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN), // ✅ Added SUPER_ADMIN
  ValidationMiddleware.validateParams(dailySummariesValidation.params),
  dailySummariesController.unlock
);

export default router;