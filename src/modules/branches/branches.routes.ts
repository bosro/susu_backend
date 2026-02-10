// src/modules/branches/branches.routes.ts
// ✅ NO RATE LIMITING - Protected by authentication middleware

import { Router } from 'express';
import { BranchesController } from './branches.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { TenantMiddleware } from '../../middleware/tenant.middleware';
import { branchesValidation } from './branches.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const branchesController = new BranchesController();

// All routes require authentication - NO rate limiting needed
router.use(
  AuthMiddleware.authenticate,
  TenantMiddleware.validateCompanyAccess
);

// ✅ Get branches assigned to current agent (accessible by all authenticated users)
router.get(
  '/my-branches',
  branchesController.getMyBranches
);

// Create branch (admin only)
router.post(
  '/',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validate(branchesValidation.create),
  branchesController.create
);

// Get all branches (accessible by all authenticated users, filtered by role)
router.get(
  '/',
  ValidationMiddleware.validateQuery(branchesValidation.query),
  branchesController.getAll
);

// Get branch by ID
router.get(
  '/:id',
  ValidationMiddleware.validateParams(branchesValidation.params),
  branchesController.getById
);

// ✅ Get agents assigned to a branch
router.get(
  '/:id/agents',
  ValidationMiddleware.validateParams(branchesValidation.params),
  branchesController.getBranchAgents
);

// Update branch (admin only)
router.patch(
  '/:id',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(branchesValidation.params),
  ValidationMiddleware.validate(branchesValidation.update),
  branchesController.update
);

// Delete branch (admin only)
router.delete(
  '/:id',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(branchesValidation.params),
  branchesController.delete
);

export default router;