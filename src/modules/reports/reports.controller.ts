// src/modules/reports/reports.controller.ts
import { Response, NextFunction } from 'express';
import { ReportsService } from './reports.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';
import { AuditLogUtil } from '../../utils/audit-log.util';
import { AuditAction } from '../../types/enums';

export class ReportsController {
  private reportsService: ReportsService;

  constructor() {
    this.reportsService = new ReportsService();
  }

  getCollectionReport = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const report = await this.reportsService.getCollectionReport(companyId, {
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string),
        branchId: req.query.branchId as string,
        agentId: req.query.agentId as string,
        customerId: req.query.customerId as string,
      });

      await AuditLogUtil.log({
        companyId,
        userId: req.user!.id,
        action: AuditAction.EXPORT,
        entityType: 'REPORT',
        changes: { reportType: 'collection', filters: req.query },
      });

      ResponseUtil.success(res, report, 'Collection report generated successfully');
    } catch (error: any) {
      next(error);
    }
  };

  getAgentPerformanceReport = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const report = await this.reportsService.getAgentPerformanceReport(companyId, {
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string),
        branchId: req.query.branchId as string,
      });

      await AuditLogUtil.log({
        companyId,
        userId: req.user!.id,
        action: AuditAction.EXPORT,
        entityType: 'REPORT',
        changes: { reportType: 'agent-performance', filters: req.query },
      });

      ResponseUtil.success(res, report, 'Agent performance report generated successfully');
    } catch (error: any) {
      next(error);
    }
  };

  getCustomerReport = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const report = await this.reportsService.getCustomerReport(companyId, {
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string),
        branchId: req.query.branchId as string,
        customerId: req.query.customerId as string,
      });

      await AuditLogUtil.log({
        companyId,
        userId: req.user!.id,
        action: AuditAction.EXPORT,
        entityType: 'REPORT',
        changes: { reportType: 'customer', filters: req.query },
      });

      ResponseUtil.success(res, report, 'Customer report generated successfully');
    } catch (error: any) {
      next(error);
    }
  };

  getBranchReport = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const report = await this.reportsService.getBranchReport(companyId, {
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string),
      });

      await AuditLogUtil.log({
        companyId,
        userId: req.user!.id,
        action: AuditAction.EXPORT,
        entityType: 'REPORT',
        changes: { reportType: 'branch', filters: req.query },
      });

      ResponseUtil.success(res, report, 'Branch report generated successfully');
    } catch (error: any) {
      next(error);
    }
  };

  getFinancialSummary = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const report = await this.reportsService.getFinancialSummary(companyId, {
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string),
        branchId: req.query.branchId as string,
      });

      await AuditLogUtil.log({
        companyId,
        userId: req.user!.id,
        action: AuditAction.EXPORT,
        entityType: 'REPORT',
        changes: { reportType: 'financial-summary', filters: req.query },
      });

      ResponseUtil.success(res, report, 'Financial summary generated successfully');
    } catch (error: any) {
      next(error);
    }
  };
}