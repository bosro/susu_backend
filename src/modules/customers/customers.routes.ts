// src/modules/customers/customers.routes.ts
// ✅ COMPLETE CUSTOMERS ROUTES - Based on your customers.controller.ts and customers.service.ts

import { Router } from 'express';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import { UserRole } from '../../types/enums';
import { CustomersController } from './customers.controller';
import { customersValidation } from './customers.validation';

const router = Router();
const customersController = new CustomersController();

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================
router.use(AuthMiddleware.authenticate);

// ============================================
// GET /customers - List all customers
// ============================================
// SUPER_ADMIN: Can see ALL customers across all companies
// COMPANY_ADMIN: Can see customers in their company only
// AGENT: Can see customers in their assigned branch only
router.get(
  '/',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.AGENT),
  ValidationMiddleware.validateQuery(customersValidation.query),
  customersController.getAll
);

// ============================================
// POST /customers - Create new customer
// ============================================
// COMPANY_ADMIN: Can create customers in their company
// AGENT: Can create customers in their assigned branch
router.post(
  '/',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN, UserRole.AGENT),
  ValidationMiddleware.validate(customersValidation.create),
  customersController.create
);

// ============================================
// GET /customers/:id - Get customer by ID
// ============================================
// All roles can view, but service layer filters by access
router.get(
  '/:id',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.AGENT),
  ValidationMiddleware.validateParams(customersValidation.params),
  customersController.getById
);

// ============================================
// PATCH /customers/:id - Update customer
// ============================================
// COMPANY_ADMIN and AGENT can update customers they have access to
router.patch(
  '/:id',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN, UserRole.AGENT),
  ValidationMiddleware.validateParams(customersValidation.params),
  ValidationMiddleware.validate(customersValidation.update),
  customersController.update
);

// ============================================
// DELETE /customers/:id - Delete customer
// ============================================
// COMPANY_ADMIN and AGENT can delete customers they have access to
router.delete(
  '/:id',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN, UserRole.AGENT),
  ValidationMiddleware.validateParams(customersValidation.params),
  customersController.delete
);

// ============================================
// POST /customers/:id/photo - Upload photo
// ============================================
// COMPANY_ADMIN and AGENT can upload photos for customers they have access to
router.post(
  '/:id/photo',
  AuthMiddleware.authorize(UserRole.COMPANY_ADMIN, UserRole.AGENT),
  ValidationMiddleware.validateParams(customersValidation.params),
  upload.single('photo'),
  customersController.uploadPhoto
);

// ============================================
// GET /customers/:id/stats - Get customer stats
// ============================================
// All roles can view stats for customers they have access to
router.get(
  '/:id/stats',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.AGENT),
  ValidationMiddleware.validateParams(customersValidation.params),
  customersController.getStats
);

export default router;