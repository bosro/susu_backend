// src/modules/susu-accounts/susu-accounts.routes.ts
// ✅ NO RATE LIMITING - Protected by authentication middleware

import { Router } from 'express';
import { SusuAccountsController } from './susu-accounts.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { TenantMiddleware } from '../../middleware/tenant.middleware';
import { susuAccountsValidation } from './susu-accounts.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const susuAccountsController = new SusuAccountsController();

// All routes require authentication - NO rate limiting needed
router.use(
  AuthMiddleware.authenticate,
  TenantMiddleware.validateCompanyAccess
);

router.post(
  '/',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.AGENT),
  ValidationMiddleware.validate(susuAccountsValidation.create),
  susuAccountsController.create
);

router.get(
  '/',
  ValidationMiddleware.validateQuery(susuAccountsValidation.query),
  susuAccountsController.getAll
);

router.get(
  '/:id',
  ValidationMiddleware.validateParams(susuAccountsValidation.params),
  susuAccountsController.getById
);

router.patch(
  '/:id',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(susuAccountsValidation.params),
  ValidationMiddleware.validate(susuAccountsValidation.update),
  susuAccountsController.update
);

router.post(
  '/:id/withdraw',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(susuAccountsValidation.params),
  ValidationMiddleware.validate(susuAccountsValidation.withdraw),
  susuAccountsController.withdraw
);

router.get(
  '/:id/transactions',
  ValidationMiddleware.validateParams(susuAccountsValidation.params),
  ValidationMiddleware.validateQuery(susuAccountsValidation.query),
  susuAccountsController.getTransactions
);

export default router;