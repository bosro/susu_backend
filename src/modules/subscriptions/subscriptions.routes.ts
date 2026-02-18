// src/modules/subscriptions/subscriptions.routes.ts
import { Router } from 'express';
import { SubscriptionsController } from './subscriptions.controller';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { subscriptionsValidation } from './subscriptions.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const ctrl = new SubscriptionsController();

// All routes: authenticated, SUPER_ADMIN only
router.use(
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.SUPER_ADMIN)
);

// ── Stats & overview ──────────────────────────────────────────────────────────
router.get('/stats', ctrl.getStats);

// ── List all subscriptions (paginated) ────────────────────────────────────────
router.get(
  '/',
  ValidationMiddleware.validateQuery(subscriptionsValidation.query),
  ctrl.getAll
);

// ── Run manual expiry check ───────────────────────────────────────────────────
router.post('/run-expiry-check', ctrl.runExpiryCheck);

// ── Per-company operations ────────────────────────────────────────────────────
router.get(
  '/companies/:companyId',
  ValidationMiddleware.validateParams(subscriptionsValidation.companyParams),
  ctrl.getCompanySubscription
);

router.post(
  '/companies/:companyId/activate',
  ValidationMiddleware.validateParams(subscriptionsValidation.companyParams),
  ValidationMiddleware.validate(subscriptionsValidation.activate),
  ctrl.activate
);

router.post(
  '/companies/:companyId/suspend',
  ValidationMiddleware.validateParams(subscriptionsValidation.companyParams),
  ValidationMiddleware.validate(subscriptionsValidation.suspend),
  ctrl.suspend
);

router.post(
  '/companies/:companyId/reactivate',
  ValidationMiddleware.validateParams(subscriptionsValidation.companyParams),
  ctrl.reactivate
);

// ── Cancel specific subscription ─────────────────────────────────────────────
router.post(
  '/:subscriptionId/cancel',
  ValidationMiddleware.validateParams(subscriptionsValidation.subscriptionParams),
  ValidationMiddleware.validate(subscriptionsValidation.cancel),
  ctrl.cancel
);

export default router;