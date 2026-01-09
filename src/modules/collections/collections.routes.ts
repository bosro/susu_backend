// src/modules/collections/collections.routes.ts
import { Router } from 'express';
import { CollectionsController } from './collections.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { TenantMiddleware } from '../../middleware/tenant.middleware';
import { collectionsValidation } from './collections.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const collectionsController = new CollectionsController();

// All routes require authentication
router.use(
  AuthMiddleware.authenticate,
  TenantMiddleware.validateCompanyAccess
);

router.post(
  '/',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN, UserRole.AGENT),
  TenantMiddleware.validateBranchAccess,
  ValidationMiddleware.validate(collectionsValidation.create),
  collectionsController.create
);

router.get(
  '/',
  ValidationMiddleware.validateQuery(collectionsValidation.query),
  collectionsController.getAll
);

router.get(
  '/stats',
  ValidationMiddleware.validateQuery(collectionsValidation.query),
  collectionsController.getStats
);

router.get(
  '/:id',
  ValidationMiddleware.validateParams(collectionsValidation.params),
  collectionsController.getById
);

router.patch(
  '/:id',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(collectionsValidation.params),
  ValidationMiddleware.validate(collectionsValidation.update),
  collectionsController.update
);

router.delete(
  '/:id',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(collectionsValidation.params),
  collectionsController.delete
);

export default router;