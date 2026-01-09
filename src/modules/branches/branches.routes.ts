// src/modules/branches/branches.routes.ts
import { Router } from 'express';
import { BranchesController } from './branches.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { TenantMiddleware } from '../../middleware/tenant.middleware';
import { branchesValidation } from './branches.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const branchesController = new BranchesController();

// All routes require authentication
router.use(
  AuthMiddleware.authenticate,
  TenantMiddleware.validateCompanyAccess
);

router.post(
  '/',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validate(branchesValidation.create),
  branchesController.create
);

router.get(
  '/',
  ValidationMiddleware.validateQuery(branchesValidation.query),
  branchesController.getAll
);

router.get(
  '/:id',
  ValidationMiddleware.validateParams(branchesValidation.params),
  branchesController.getById
);

router.patch(
  '/:id',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(branchesValidation.params),
  ValidationMiddleware.validate(branchesValidation.update),
  branchesController.update
);

router.delete(
  '/:id',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(branchesValidation.params),
  branchesController.delete
);

router.get(
  '/:id/stats',
  ValidationMiddleware.validateParams(branchesValidation.params),
  branchesController.getStats
);

export default router;