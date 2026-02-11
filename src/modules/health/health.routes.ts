// src/modules/health/health.routes.ts
// ✅ NO RATE LIMITING - Health checks should be unrestricted

import { Router } from 'express';
import { HealthController } from './health.controller';

const router = Router();
const healthController = new HealthController();

router.get('/', healthController.check.bind(healthController));
router.get('/readiness', healthController.readiness.bind(healthController));
router.get('/liveness', healthController.liveness.bind(healthController));

export default router;