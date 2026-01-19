// src/modules/collections/collections.controller.ts
import { Response, NextFunction } from 'express';
import { CollectionsService } from './collections.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';

export class CollectionsController {
  private collectionsService: CollectionsService;

  constructor() {
    this.collectionsService = new CollectionsService();
  }

  create = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // ✅ Super admin needs to specify companyId and branchId in request body
      // since they don't have default ones
      const companyId = req.user!.companyId || req.body.companyId;
      const branchId = req.user!.branchId || req.body.branchId;
      const agentId = req.body.agentId || req.user!.id;

      if (!companyId) {
        ResponseUtil.badRequest(res, 'Company ID is required');
        return;
      }

      if (!branchId) {
        ResponseUtil.badRequest(res, 'Branch ID is required');
        return;
      }

      const collection = await this.collectionsService.create(
        companyId,
        branchId,
        agentId,
        req.body
      );
      ResponseUtil.created(res, collection, 'Collection recorded successfully');
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
      const userRole = req.user!.role;
      const userId = req.user!.id;
      const userBranchId = req.user!.branchId || undefined;

      console.log('Collections controller - getAll:', {
        companyId,
        userRole,
        userId,
        userBranchId,
        query: req.query
      });

      const result = await this.collectionsService.getAll(
        companyId,
        req.query,
        userRole,
        userId,
        userBranchId
      );

      ResponseUtil.success(res, result, 'Collections retrieved successfully');
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
      const collection = await this.collectionsService.getById(
        req.params.id,
        companyId,
        req.user!.role,
        req.user!.id
      );
      ResponseUtil.success(res, collection, 'Collection retrieved successfully');
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
      const collection = await this.collectionsService.update(
        req.params.id,
        companyId,
        req.body,
        req.user!.id,
        req.user!.role
      );
      ResponseUtil.success(res, collection, 'Collection updated successfully');
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
      const result = await this.collectionsService.delete(
        req.params.id,
        companyId,
        req.user!.id,
        req.user!.role
      );
      ResponseUtil.success(res, result, 'Collection deleted successfully');
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
      
      console.log('📊 Getting collection stats:', {
        companyId,
        userRole: req.user!.role,
        filters: req.query
      });

      const stats = await this.collectionsService.getStats(companyId, req.query);
      ResponseUtil.success(res, stats, 'Collection stats retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };
}

