// src/modules/branches/branches.controller.ts
import { Response, NextFunction } from 'express';
import { BranchesService } from './branches.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';

export class BranchesController {
  private branchesService: BranchesService;

  constructor() {
    this.branchesService = new BranchesService();
  }

  create = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // ✅ Super admin needs to specify companyId in request body
      const companyId = req.user!.companyId || req.body.companyId;

      if (!companyId) {
        ResponseUtil.badRequest(res, 'Company ID is required');
        return;
      }

      const branch = await this.branchesService.create(
        companyId,
        req.body,
        req.user!.id
      );
      ResponseUtil.created(res, branch, 'Branch created successfully');
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
      const companyId = req.user!.companyId;  // ✅ Can be null for SUPER_ADMIN
      const result = await this.branchesService.getAll(companyId, req.query);
      ResponseUtil.success(res, result, 'Branches retrieved successfully');
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
      const companyId = req.user!.companyId;  // ✅ Can be null for SUPER_ADMIN
      const branch = await this.branchesService.getById(req.params.id, companyId);
      ResponseUtil.success(res, branch, 'Branch retrieved successfully');
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
      const companyId = req.user!.companyId;  // ✅ Can be null for SUPER_ADMIN
      const branch = await this.branchesService.update(
        req.params.id,
        companyId,
        req.body,
        req.user!.id
      );
      ResponseUtil.success(res, branch, 'Branch updated successfully');
    } catch (error: any) {
      next(error);
    }
  };

  delete = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId;  // ✅ Can be null for SUPER_ADMIN
      const result = await this.branchesService.delete(
        req.params.id,
        companyId,
        req.user!.id
      );
      ResponseUtil.success(res, result, 'Branch deleted successfully');
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
      const companyId = req.user!.companyId;  // ✅ Can be null for SUPER_ADMIN
      const stats = await this.branchesService.getStats(req.params.id, companyId);
      ResponseUtil.success(res, stats, 'Branch stats retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };
}