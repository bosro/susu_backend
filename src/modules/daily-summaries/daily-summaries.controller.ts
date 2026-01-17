// src/modules/daily-summaries/daily-summaries.controller.ts
import { Response, NextFunction } from 'express';
import { DailySummariesService } from './daily-summaries.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';

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
      const branchId = req.user!.branchId!;
      const agentId = req.user!.id;

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

async getById(
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.user!.companyId || null; // ✅ Allow null for SUPER_ADMIN
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
}

async update(
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.user!.companyId || null; // ✅ Allow null
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
}

async lock(
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.user!.companyId || null; // ✅ Allow null
    const summary = await this.dailySummariesService.lock(
      req.params.id,
      companyId,
      req.user!.id
    );
    ResponseUtil.success(res, summary, 'Daily summary locked successfully');
  } catch (error: any) {
    next(error);
  }
}

async unlock(
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.user!.companyId || null; // ✅ Allow null
    const summary = await this.dailySummariesService.unlock(
      req.params.id,
      companyId,
      req.user!.id
    );
    ResponseUtil.success(res, summary, 'Daily summary unlocked successfully');
  } catch (error: any) {
    next(error);
  }
}

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

