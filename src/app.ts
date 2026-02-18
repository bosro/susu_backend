// src/app.ts
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config } from './config';
// ❌ REMOVED: Global rate limiter from here - will apply selectively per route
import { ErrorMiddleware } from './middleware/error.middleware';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import companiesRoutes from './modules/companies/companies.routes';
import usersRoutes from './modules/users/users.routes';
import branchesRoutes from './modules/branches/branches.routes';
import customersRoutes from './modules/customers/customers.routes';
import susuPlansRoutes from './modules/susu-plans/susu-plans.routes';
import susuAccountsRoutes from './modules/susu-accounts/susu-accounts.routes';
import collectionsRoutes from './modules/collections/collections.routes';
import dailySummariesRoutes from './modules/daily-summaries/daily-summaries.routes';
import reportsRoutes from './modules/reports/reports.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import healthRoutes from './modules/health/health.routes';
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes';


class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security
    this.app.use(helmet());
    
    // CORS
    this.app.use(
      cors({
        origin: config.cors.origin,
        credentials: true,
      })
    );

    // Compression
    this.app.use(compression());

    // Body parsers
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (config.env === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // ❌ REMOVED: Global rate limiter
    // Rate limiting is now applied selectively in individual route files
    // this.app.use('/api', rateLimiter);

    // Health check
    this.app.get('/health', (_, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.env,
      });
    });
  }

  private initializeRoutes(): void {
    const apiVersion = config.apiVersion;

    // API routes - rate limiting applied individually in route files
    this.app.use(`/api/${apiVersion}/auth`, authRoutes);
    this.app.use(`/api/${apiVersion}/companies`, companiesRoutes);
    this.app.use(`/api/${apiVersion}/users`, usersRoutes);
    this.app.use(`/api/${apiVersion}/branches`, branchesRoutes);
    this.app.use(`/api/${apiVersion}/customers`, customersRoutes);
    this.app.use(`/api/${apiVersion}/susu-plans`, susuPlansRoutes);
    this.app.use(`/api/${apiVersion}/susu-accounts`, susuAccountsRoutes);
    this.app.use(`/api/${apiVersion}/collections`, collectionsRoutes);
    this.app.use(`/api/${apiVersion}/daily-summaries`, dailySummariesRoutes);
    this.app.use(`/api/${apiVersion}/reports`, reportsRoutes);
    this.app.use(`/api/${apiVersion}/notifications`, notificationsRoutes);
    this.app.use(`/api/${apiVersion}/subscriptions`, subscriptionsRoutes);
    this.app.use('/health', healthRoutes);

    // 404 handler
    this.app.use(ErrorMiddleware.notFound);
  }

  private initializeErrorHandling(): void {
    this.app.use(ErrorMiddleware.handle);
  }
}

export default new App().app;