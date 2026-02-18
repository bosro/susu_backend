// src/modules/subscriptions/subscriptions.controller.ts
import { Response, NextFunction } from 'express';
import { SubscriptionsService, SubscriptionPlan } from './subscriptions.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';

export class SubscriptionsController {
  private service: SubscriptionsService;

  constructor() {
    this.service = new SubscriptionsService();
  }

  // POST /subscriptions/companies/:companyId/activate
  activate = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { companyId } = req.params;
      const result = await this.service.activateSubscription(
        companyId,
        req.body,
        req.user!.id
      );
      ResponseUtil.created(res, result, 'Subscription activated successfully');
    } catch (error: any) {
      next(error);
    }
  };

  // POST /subscriptions/companies/:companyId/suspend
  suspend = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { companyId } = req.params;
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        ResponseUtil.badRequest(res, 'Suspension reason is required');
        return;
      }

      const result = await this.service.suspendCompany(
        companyId,
        reason.trim(),
        req.user!.id
      );
      ResponseUtil.success(res, result, 'Company suspended successfully');
    } catch (error: any) {
      next(error);
    }
  };

  // POST /subscriptions/companies/:companyId/reactivate
  reactivate = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { companyId } = req.params;
      const result = await this.service.reactivateCompany(companyId, req.user!.id);
      ResponseUtil.success(res, result, 'Company reactivated successfully');
    } catch (error: any) {
      next(error);
    }
  };

  // POST /subscriptions/:subscriptionId/cancel
  cancel = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { subscriptionId } = req.params;
      const { reason } = req.body;

      const result = await this.service.cancelSubscription(
        subscriptionId,
        reason || 'Cancelled by admin',
        req.user!.id
      );
      ResponseUtil.success(res, result, 'Subscription cancelled');
    } catch (error: any) {
      next(error);
    }
  };

  // GET /subscriptions/companies/:companyId
  getCompanySubscription = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { companyId } = req.params;
      const result = await this.service.getCompanySubscription(companyId);
      ResponseUtil.success(res, result, 'Subscription retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };

  // GET /subscriptions
  getAll = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getAll(req.query as any);
      ResponseUtil.success(res, result, 'Subscriptions retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };

  // POST /subscriptions/run-expiry-check (manual trigger)
  runExpiryCheck = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.checkAndExpireSubscriptions(req.user!.id);
      ResponseUtil.success(res, result, 'Expiry check completed');
    } catch (error: any) {
      next(error);
    }
  };

  // GET /subscriptions/stats
  getStats = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getSubscriptionStats();
      ResponseUtil.success(res, result, 'Subscription stats retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };
}