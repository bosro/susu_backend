// src/modules/inventory/inventory.routes.ts
// ✅ FIXED: Static routes (sales, overview) declared BEFORE /:id param routes
//    so Express doesn't match "sales" or "stats" as a UUID param

import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { TenantMiddleware } from '../../middleware/tenant.middleware';
import { inventoryValidation } from './inventory.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const inventoryController = new InventoryController();

// All routes require authentication
router.use(AuthMiddleware.authenticate, TenantMiddleware.validateCompanyAccess);

// ── Overview ─────────────────────────────────────────────────────
// MUST be before /:id routes
router.get('/overview', inventoryController.getOverview);

// ── Sales (static routes FIRST, before any /:id) ─────────────────
// MUST be before /items/:id/... routes so "sales" is not matched as an item :id
router.get(
  '/sales/stats',
  ValidationMiddleware.validateQuery(inventoryValidation.saleQuery),
  inventoryController.getSalesStats,
);

router.get(
  '/sales',
  ValidationMiddleware.validateQuery(inventoryValidation.saleQuery),
  inventoryController.getAllSales,
);

router.post(
  '/sales',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validate(inventoryValidation.createSale),
  inventoryController.recordSale,
);

// ── Items (list + create, no :id) ─────────────────────────────────
router.get(
  '/items',
  ValidationMiddleware.validateQuery(inventoryValidation.itemQuery),
  inventoryController.getAllItems,
);

router.post(
  '/items',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validate(inventoryValidation.createItem),
  inventoryController.createItem,
);

// ── Item sub-routes with :id (AFTER all static routes) ────────────
router.get(
  '/items/:id',
  ValidationMiddleware.validateParams(inventoryValidation.params),
  inventoryController.getItemById,
);

router.patch(
  '/items/:id',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(inventoryValidation.params),
  ValidationMiddleware.validate(inventoryValidation.updateItem),
  inventoryController.updateItem,
);

router.delete(
  '/items/:id',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(inventoryValidation.params),
  inventoryController.deleteItem,
);

router.post(
  '/items/:id/restock',
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
  ValidationMiddleware.validateParams(inventoryValidation.params),
  ValidationMiddleware.validate(inventoryValidation.createRestock),
  inventoryController.restockItem,
);

router.get(
  '/items/:id/restocks',
  ValidationMiddleware.validateParams(inventoryValidation.params),
  ValidationMiddleware.validateQuery(inventoryValidation.restockQuery),
  inventoryController.getRestockHistory,
);

export default router;