// src/modules/collections/collections.controller.ts
// ✅ UPDATED - Added unread count and mark as read endpoints

import { Response, NextFunction } from 'express';
import { CollectionsService } from './collections.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';
import { UserRole } from '../../types/enums';

export class CollectionsController {
  private collectionsService: CollectionsService;

  constructor() {
    this.collectionsService = new CollectionsService();
  }

  // ✅ NEW: Get unread collection count
  getUnreadCount = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      const userRole = req.user!.role;

      console.log('📬 Getting unread count:', { userId, companyId, userRole });

      const count = await this.collectionsService.getUnreadCount(
        userId,
        companyId,
        userRole
      );

      ResponseUtil.success(res, { count }, 'Unread count retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ NEW: Mark collection as read
  markAsRead = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const collectionId = req.params.id;

      await this.collectionsService.markAsRead(collectionId, userId);

      ResponseUtil.success(res, null, 'Collection marked as read');
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ NEW: Mark multiple collections as read
  markMultipleAsRead = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { collectionIds } = req.body;

      if (!Array.isArray(collectionIds) || collectionIds.length === 0) {
        ResponseUtil.badRequest(res, 'Collection IDs array is required');
        return;
      }

      await this.collectionsService.markMultipleAsRead(collectionIds, userId);

      ResponseUtil.success(res, null, 'Collections marked as read');
    } catch (error: any) {
      next(error);
    }
  };

  create = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId || req.body.companyId;
      const branchId = req.body.branchId;
      const agentId = req.body.agentId || req.user!.id;

      if (!companyId) {
        ResponseUtil.badRequest(res, 'Company ID is required');
        return;
      }

      if (!branchId) {
        ResponseUtil.badRequest(res, 'Branch ID is required');
        return;
      }

      if (req.user!.role === UserRole.AGENT) {
        await this.collectionsService.validateAgentBranchAccess(
          req.user!.id,
          branchId
        );
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
      const companyId = req.user!.companyId;
      const userRole = req.user!.role;
      const userId = req.user!.id;

      console.log('Collections controller - getAll:', {
        companyId,
        userRole,
        userId,
        query: req.query
      });

      const result = await this.collectionsService.getAll(
        companyId,
        req.query,
        userRole,
        userId
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
      const companyId = req.user!.companyId;
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
      const companyId = req.user!.companyId;
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
      const companyId = req.user!.companyId;
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
      const companyId = req.user!.companyId;
      
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