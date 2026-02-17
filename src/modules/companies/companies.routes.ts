// src/modules/companies/companies.routes.ts
// ✅ NO RATE LIMITING - Protected by authentication middleware

import { Router } from 'express';
import { CompaniesController } from './companies.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { TenantMiddleware } from '../../middleware/tenant.middleware';
import { companiesValidation } from './companies.validation';
import { upload } from '../../middleware/upload.middleware';
import { UserRole } from '../../types/enums';

const router = Router();
const companiesController = new CompaniesController();

// All routes require authentication - NO rate limiting needed
router.use(AuthMiddleware.authenticate);

// Super admin routes
router.get(
  '/',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN),
  ValidationMiddleware.validateQuery(companiesValidation.query),
  companiesController.getAll
);

router.patch(
  '/:id/status',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN),
  ValidationMiddleware.validateParams(companiesValidation.params),
  ValidationMiddleware.validate(companiesValidation.updateStatus),
  companiesController.updateStatus
);

// Company admin routes
router.get(
  '/:id',
  ValidationMiddleware.validateParams(companiesValidation.params),
  TenantMiddleware.validateCompanyAccess,
  companiesController.getById
);

router.patch(
  '/:id',
  ValidationMiddleware.validateParams(companiesValidation.params),
  ValidationMiddleware.validate(companiesValidation.update),
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN),
  TenantMiddleware.validateCompanyAccess,
  companiesController.update
);

router.post(
  '/:id/logo',
  ValidationMiddleware.validateParams(companiesValidation.params),
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN),
  TenantMiddleware.validateCompanyAccess,
  upload.single('logo'),
  companiesController.uploadLogo
);

router.delete(
  '/:id/logo',
  ValidationMiddleware.validateParams(companiesValidation.params),
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN),
  TenantMiddleware.validateCompanyAccess,
  companiesController.deleteLogo
);

router.get(
  '/:id/stats',
  ValidationMiddleware.validateParams(companiesValidation.params),
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN),
  TenantMiddleware.validateCompanyAccess,
  companiesController.getStats
);

export default router;

