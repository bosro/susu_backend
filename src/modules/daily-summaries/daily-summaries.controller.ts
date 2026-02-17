// src/modules/daily-summaries/daily-summaries.controller.ts
import { Response, NextFunction } from 'express';
import { DailySummariesService } from './daily-summaries.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';
import { UserRole } from '../../types/enums';

export class DailySummariesController {
  private dailySummariesService: DailySummariesService;

  constructor() {
    this.dailySummariesService = new DailySummariesService();
  }

  generate = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const agentId = req.user!.id;
      const userRole = req.user!.role;

      let branchId: string;

      if (userRole === UserRole.AGENT) {
        // ✅ Agents: branchId comes from their JWT token (assigned branch)
        branchId = req.user!.branchId!;
        if (!branchId) {
          ResponseUtil.badRequest(res, 'You are not assigned to any branch. Please contact your administrator.');
          return;
        }
      } else {
        // ✅ COMPANY_ADMIN / SUPER_ADMIN: branchId must be provided in request body
        branchId = req.body.branchId;
        if (!branchId) {
          ResponseUtil.badRequest(res, 'Branch ID is required. Please select a branch to generate the summary for.');
          return;
        }
      }

      const summary = await this.dailySummariesService.generate(
        companyId,
        branchId,
        agentId,
        new Date(req.body.date)
      );

      ResponseUtil.created(res, summary, 'Daily summary generated successfully');
    } catch (error: any) {
      next(error);
    }
  };

  getAll = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const result = await this.dailySummariesService.getAll(
        companyId,
        req.query,
        req.user!.role,
        req.user!.id,
        req.user!.branchId || undefined
      );
      ResponseUtil.success(res, result, 'Daily summaries retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };

  getById = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId || null;
      const summary = await this.dailySummariesService.getById(
        req.params.id,
        companyId,
        req.user!.role,
        req.user!.id
      );
      ResponseUtil.success(res, summary, 'Daily summary retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };

  update = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId || null;
      const summary = await this.dailySummariesService.update(
        req.params.id,
        companyId,
        req.body,
        req.user!.id
      );
      ResponseUtil.success(res, summary, 'Daily summary updated successfully');
    } catch (error: any) {
      next(error);
    }
  };

  lock = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId || null;
      const summary = await this.dailySummariesService.lock(
        req.params.id,
        companyId,
        req.user!.id
      );
      ResponseUtil.success(res, summary, 'Daily summary locked successfully');
    } catch (error: any) {
      next(error);
    }
  };

  unlock = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId || null;
      const summary = await this.dailySummariesService.unlock(
        req.params.id,
        companyId,
        req.user!.id
      );
      ResponseUtil.success(res, summary, 'Daily summary unlocked successfully');
    } catch (error: any) {
      next(error);
    }
  };

  getStats = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const stats = await this.dailySummariesService.getStats(companyId, req.query);
      ResponseUtil.success(res, stats, 'Stats retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };
}