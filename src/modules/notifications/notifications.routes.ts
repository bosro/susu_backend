// src/modules/susu-plans/susu-plans.routes.ts
import { Router } from 'express';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { TenantMiddleware } from '../../middleware/tenant.middleware';

import { upload } from '../../middleware/upload.middleware';
import { UserRole } from '../../types/enums';
import { susuPlansValidation } from '../susu-plans/susu-plans.validation';
import { SusuPlansController } from '../susu-plans/susu-plans.controller';

const router = Router();
const susuPlansController = new SusuPlansController();

// All routes require authentication
router.use(
  AuthMiddleware.authenticate,
  TenantMiddleware.validateCompanyAccess
);

router.post(
  '/',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN),
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
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(susuPlansValidation.params),
  ValidationMiddleware.validate(susuPlansValidation.update),
  susuPlansController.update
);

router.delete(
  '/:id',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(susuPlansValidation.params),
  susuPlansController.delete
);

router.post(
  '/:id/image',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(susuPlansValidation.params),
  upload.single('image'),
  susuPlansController.uploadImage
);

export default router;