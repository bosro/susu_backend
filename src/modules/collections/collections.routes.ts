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

// ✅ FIXED: Removed TenantMiddleware.validateBranchAccess
//    Agents don't have branchId in JWT token - it's in AgentBranchAssignment table
//    Controller handles validation via validateAgentBranchAccess()
router.post(
  '/',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.AGENT),
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
  '/unread-count',
  collectionsController.getUnreadCount
);

router.post(
  '/mark-read',
  collectionsController.markMultipleAsRead
);

router.get(
  '/:id',
  ValidationMiddleware.validateParams(collectionsValidation.params),
  collectionsController.getById
);

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