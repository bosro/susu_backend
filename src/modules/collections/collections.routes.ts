// src/modules/collections/collections.routes.ts
// ✅ NO RATE LIMITING - Protected by authentication middleware

import { Router } from 'express';
import { CollectionsController } from './collections.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { TenantMiddleware } from '../../middleware/tenant.middleware';
import { collectionsValidation } from './collections.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const collectionsController = new CollectionsController();

// All routes require authentication - NO rate limiting needed
router.use(
  AuthMiddleware.authenticate,
  TenantMiddleware.validateCompanyAccess
);

router.post(
  '/',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.AGENT),
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

// ✅ Get unread collection count
router.get(
  '/unread-count',
  collectionsController.getUnreadCount
);

// ✅ Mark multiple collections as read
router.post(
  '/mark-read',
  collectionsController.markMultipleAsRead
);

router.get(
  '/:id',
  ValidationMiddleware.validateParams(collectionsValidation.params),
  collectionsController.getById
);

// ✅ Mark single collection as read
router.post(
  '/:id/mark-read',
  ValidationMiddleware.validateParams(collectionsValidation.params),
  collectionsController.markAsRead
);

router.patch(
  '/:id',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(collectionsValidation.params),
  ValidationMiddleware.validate(collectionsValidation.update),
  collectionsController.update
);

router.delete(
  '/:id',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(collectionsValidation.params),
  collectionsController.delete
);

export default router;