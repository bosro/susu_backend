// src/modules/daily-summaries/daily-summaries.controller.ts
import { Response, NextFunction } from 'express';
import { DailySummariesService } from './daily-summaries.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';
import { UserRole } from '../../types/enums';
import { prisma } from '../../config/database';

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
        // ✅ FIX: Agents don't have branchId on their JWT token.
        //    Look up their assigned branches from AgentBranchAssignment.
        const assignments = await prisma.agentBranchAssignment.findMany({
          where: { userId: agentId },
          include: {
            branch: { select: { id: true, name: true, isActive: true } },
          },
        });

        const activeBranches = assignments
          .filter(a => a.branch.isActive)
          .map(a => a.branch);

        if (activeBranches.length === 0) {
          ResponseUtil.badRequest(
            res,
            'You are not assigned to any active branch. Please contact your administrator.'
          );
          return;
        }

        if (activeBranches.length === 1) {
          // Single branch — use it automatically
          branchId = activeBranches[0].id;
        } else {
          // Multiple branches — agent must specify which one
          if (!req.body.branchId) {
            ResponseUtil.badRequest(
              res,
              'You are assigned to multiple branches. Please specify which branch to generate the summary for.'
            );
            return;
          }

          const isAssigned = activeBranches.some(b => b.id === req.body.branchId);
          if (!isAssigned) {
            ResponseUtil.badRequest(res, 'You do not have access to the selected branch.');
            return;
          }

          branchId = req.body.branchId;
        }
      } else {
        // COMPANY_ADMIN / SUPER_ADMIN: branchId must be provided in request body
        branchId = req.body.branchId;
        if (!branchId) {
          ResponseUtil.badRequest(
            res,
            'Branch ID is required. Please select a branch to generate the summary for.'
          );
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
        // ✅ FIX: removed req.user!.branchId — service looks up AgentBranchAssignment itself
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