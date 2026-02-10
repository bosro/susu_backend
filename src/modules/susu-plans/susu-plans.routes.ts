// src/modules/susu-plans/susu-plans.routes.ts
// ✅ NO RATE LIMITING - Protected by authentication middleware

import { Router } from 'express';
import { SusuPlansController } from './susu-plans.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { TenantMiddleware } from '../../middleware/tenant.middleware';
import { susuPlansValidation } from './susu-plans.validation';
import { upload } from '../../middleware/upload.middleware';
import { UserRole } from '../../types/enums';

const router = Router();
const susuPlansController = new SusuPlansController();

// All routes require authentication - NO rate limiting needed
router.use(
  AuthMiddleware.authenticate,
  TenantMiddleware.validateCompanyAccess
);

router.post(
  '/',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validate(susuPlansValidation.create),
  susuPlansController.create
);

router.get(
  '/',
  ValidationMiddleware.validateQuery(susuPlansValidation.query),
  susuPlansController.getAll
);

router.get(
  '/:id',
  ValidationMiddleware.validateParams(susuPlansValidation.params),
  susuPlansController.getById
);

router.patch(
  '/:id',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(susuPlansValidation.params),
  ValidationMiddleware.validate(susuPlansValidation.update),
  susuPlansController.update
);

router.delete(
  '/:id',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(susuPlansValidation.params),
  susuPlansController.delete
);

router.post(
  '/:id/image',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(susuPlansValidation.params),
  upload.single('image'),
  susuPlansController.uploadImage
);

export default router;