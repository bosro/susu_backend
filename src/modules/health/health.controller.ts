// src/modules/health/health.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { ResponseUtil } from '../../utils/response.util';

export class HealthController {
  async check(_req: Request, res: Response): Promise<void> {
    try {
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: {
          database: 'unknown',
          redis: 'unknown',
        },
      };

      // Check database
      try {
        await prisma.$queryRaw`SELECT 1`;
        health.services.database = 'healthy';
      } catch {
        health.services.database = 'unhealthy';
        health.status = 'degraded';
      }

      // Check Redis
      try {
        await redis.ping();
        health.services.redis = 'healthy';
      } catch {
        health.services.redis = 'unhealthy';
        health.status = 'degraded';
      }

      const statusCode = health.status === 'ok' ? 200 : 503;
      ResponseUtil.success(res, health, 'Health check completed', statusCode);
    } catch (error) {
      ResponseUtil.error(res, 'Health check failed', 500);
    }
  }

  async readiness(_req: Request, res: Response): Promise<void> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await redis.ping();
      
      ResponseUtil.success(res, { ready: true }, 'Service is ready');
    } catch (error) {
      ResponseUtil.error(res, 'Service is not ready', 503);
    }
  }

  async liveness(_req: Request, res: Response): Promise<void> {
    ResponseUtil.success(res, { alive: true }, 'Service is alive');
  }
}