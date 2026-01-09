// src/modules/customers/customers.routes.ts
import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { TenantMiddleware } from '../../middleware/tenant.middleware';
import { customersValidation } from './customers.validation';
import { upload } from '../../middleware/upload.middleware';
import { UserRole } from '../../types/enums';

const router = Router();
const customersController = new CustomersController();

// All routes require authentication
router.use(
  AuthMiddleware.authenticate,
  TenantMiddleware.validateCompanyAccess
);

router.post(
  '/',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN, UserRole.AGENT),
  ValidationMiddleware.validate(customersValidation.create),
  customersController.create
);

router.get(
  '/',
  ValidationMiddleware.validateQuery(customersValidation.query),
  customersController.getAll
);

router.get(
  '/:id',
  ValidationMiddleware.validateParams(customersValidation.params),
  customersController.getById
);

router.patch(
  '/:id',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN, UserRole.AGENT),
  ValidationMiddleware.validateParams(customersValidation.params),
  ValidationMiddleware.validate(customersValidation.update),
  customersController.update
);

router.delete(
  '/:id',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(customersValidation.params),
  customersController.delete
);

router.post(
  '/:id/photo',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN, UserRole.AGENT),
  ValidationMiddleware.validateParams(customersValidation.params),
  upload.single('photo'),
  customersController.uploadPhoto
);

router.get(
  '/:id/stats',
  ValidationMiddleware.validateParams(customersValidation.params),
  customersController.getStats
);

export default router;