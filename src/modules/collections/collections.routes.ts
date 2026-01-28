// src/modules/collections/collections.routes.ts
// ✅ UPDATED - Added unread count and mark as read routes

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

// ✅ NEW: Get unread collection count
router.get(
  '/unread-count',
  collectionsController.getUnreadCount
);

// ✅ NEW: Mark multiple collections as read
router.post(
  '/mark-read',
  collectionsController.markMultipleAsRead
);

router.get(
  '/:id',
  ValidationMiddleware.validateParams(collectionsValidation.params),
  collectionsController.getById
);

// ✅ NEW: Mark single collection as read
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