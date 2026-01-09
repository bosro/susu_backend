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
      const companyId = req.user!.companyId!;
      const branchId = req.user!.branchId!;
      const agentId = req.user!.id;

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
      const companyId = req.user!.companyId!;
      const result = await this.collectionsService.getAll(
        companyId,
        req.query,
        req.user!.role,
        req.user!.id,
        req.user!.branchId || undefined
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
      const companyId = req.user!.companyId!;
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
      const companyId = req.user!.companyId!;
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
      const companyId = req.user!.companyId!;
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
      const companyId = req.user!.companyId!;
      const stats = await this.collectionsService.getStats(companyId, req.query);
      ResponseUtil.success(res, stats, 'Collection stats retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };
}