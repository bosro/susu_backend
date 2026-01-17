// src/modules/susu-plans/susu-plans.controller.ts
import { Response, NextFunction } from 'express';
import { SusuPlansService } from './susu-plans.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';

export class SusuPlansController {
  private susuPlansService: SusuPlansService;

  constructor() {
    this.susuPlansService = new SusuPlansService();
  }

  create = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const susuPlan = await this.susuPlansService.create(
        companyId,
        req.body,
        req.user!.id
      );
      ResponseUtil.created(res, susuPlan, 'Susu plan created successfully');
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
      const result = await this.susuPlansService.getAll(companyId, req.query);
      ResponseUtil.success(res, result, 'Susu plans retrieved successfully');
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
      const susuPlan = await this.susuPlansService.getById(
        req.params.id,
        companyId
      );
      ResponseUtil.success(res, susuPlan, 'Susu plan retrieved successfully');
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
      const susuPlan = await this.susuPlansService.update(
        req.params.id,
        companyId,
        req.body,
        req.user!.id
      );
      ResponseUtil.success(res, susuPlan, 'Susu plan updated successfully');
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
      const result = await this.susuPlansService.delete(
        req.params.id,
        companyId,
        req.user!.id
      );
      ResponseUtil.success(res, result, 'Susu plan deleted successfully');
    } catch (error: any) {
      next(error);
    }
  };

  uploadImage = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.file) {
        ResponseUtil.badRequest(res, 'No file uploaded');
        return;
      }

      const companyId = req.user!.companyId!;
      const susuPlan = await this.susuPlansService.uploadImage(
        req.params.id,
        companyId,
        req.file.buffer,
        req.user!.id
      );
      ResponseUtil.success(res, susuPlan, 'Image uploaded successfully');
    } catch (error: any) {
      next(error);
    }
  };
}

