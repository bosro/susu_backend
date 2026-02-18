// src/modules/branches/branches.controller.ts
// ✅ Updated to pass user role and ID for agent-specific filtering

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
      const companyId = req.user!.companyId;

      // ✅ Pass user role and ID for agent-specific filtering
      const queryWithUser = {
        ...req.query,
        userRole: req.user!.role,
        userId: req.user!.id,
      };

      console.log('🏢 Fetching branches:', {
        companyId,
        userRole: req.user!.role,
        userId: req.user!.id,
      });

      const result = await this.branchesService.getAll(companyId, queryWithUser);
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
      const companyId = req.user!.companyId;
      const branch = await this.branchesService.getById(
        req.params.id,
        companyId
      );
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
      const companyId = req.user!.companyId;
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
      const companyId = req.user!.companyId;
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

  // ✅ NEW: Get branches for current agent
  getMyBranches = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const branches = await this.branchesService.getAgentBranches(
        req.user!.id
      );
      ResponseUtil.success(
        res,
        branches,
        'Agent branches retrieved successfully'
      );
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ NEW: Get agents for a specific branch
  getBranchAgents = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const agents = await this.branchesService.getBranchAgents(
        req.params.id
      );
      ResponseUtil.success(
        res,
        agents,
        'Branch agents retrieved successfully'
      );
    } catch (error: any) {
      next(error);
    }
  };
}
