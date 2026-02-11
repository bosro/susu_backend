// src/modules/reports/reports.routes.ts
// ✅ NO RATE LIMITING - Protected by authentication middleware

import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { TenantMiddleware } from '../../middleware/tenant.middleware';
import { reportsValidation } from './reports.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const reportsController = new ReportsController();

// All routes require authentication - NO rate limiting needed
router.use(
  AuthMiddleware.authenticate,
  TenantMiddleware.validateCompanyAccess
);

router.get(
  '/collections',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateQuery(reportsValidation.query),
  reportsController.getCollectionReport
);

router.get(
  '/agent-performance',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateQuery(reportsValidation.query),
  reportsController.getAgentPerformanceReport
);

router.get(
  '/customers',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateQuery(reportsValidation.query),
  reportsController.getCustomerReport
);

router.get(
  '/branches',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateQuery(reportsValidation.query),
  reportsController.getBranchReport
);

router.get(
  '/financial-summary',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateQuery(reportsValidation.query),
  reportsController.getFinancialSummary
);

export default router;