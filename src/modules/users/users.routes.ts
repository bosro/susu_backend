// src/modules/users/users.routes.ts
import { Router } from 'express';
import { UsersController } from './users.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { TenantMiddleware } from '../../middleware/tenant.middleware';
import { usersValidation } from './users.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const usersController = new UsersController();

// All routes require authentication and company admin role
router.use(
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN),
  TenantMiddleware.validateCompanyAccess
);

router.post(
  '/',
  ValidationMiddleware.validate(usersValidation.create),
  usersController.create
);

router.get(
  '/',
  ValidationMiddleware.validateQuery(usersValidation.query),
  usersController.getAll
);

router.get(
  '/:id',
  ValidationMiddleware.validateParams(usersValidation.params),
  usersController.getById
);

router.patch(
  '/:id',
  ValidationMiddleware.validateParams(usersValidation.params),
  ValidationMiddleware.validate(usersValidation.update),
  usersController.update
);

router.delete(
  '/:id',
  ValidationMiddleware.validateParams(usersValidation.params),
  usersController.delete
);

router.post(
  '/:id/reset-password',
  ValidationMiddleware.validateParams(usersValidation.params),
  usersController.resetPassword
);

export default router;