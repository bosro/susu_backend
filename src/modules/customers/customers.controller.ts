// src/modules/customers/customers.controller.ts
import { Response, NextFunction } from 'express';
import { CustomersService } from './customers.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';

export class CustomersController {
  private customersService: CustomersService;

  constructor() {
    this.customersService = new CustomersService();
  }

  create = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const customer = await this.customersService.create(
        companyId,
        req.body,
        req.user!.id
      );
      ResponseUtil.created(res, customer, 'Customer created successfully');
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
      const result = await this.customersService.getAll(
        companyId,
        req.query,
        req.user!.role,
        req.user!.branchId || undefined
      );
      ResponseUtil.success(res, result, 'Customers retrieved successfully');
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
      const customer = await this.customersService.getById(
        req.params.id,
        companyId,
        req.user!.role,
        req.user!.branchId || undefined
      );
      ResponseUtil.success(res, customer, 'Customer retrieved successfully');
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
      const customer = await this.customersService.update(
        req.params.id,
        companyId,
        req.body,
        req.user!.id
      );
      ResponseUtil.success(res, customer, 'Customer updated successfully');
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
      const result = await this.customersService.delete(
        req.params.id,
        companyId,
        req.user!.id
      );
      ResponseUtil.success(res, result, 'Customer deleted successfully');
    } catch (error: any) {
      next(error);
    }
  };

  uploadPhoto = async (
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
      const customer = await this.customersService.uploadPhoto(
        req.params.id,
        companyId,
        req.file.buffer,
        req.user!.id
      );
      ResponseUtil.success(res, customer, 'Photo uploaded successfully');
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
      const stats = await this.customersService.getCustomerStats(
        req.params.id,
        companyId
      );
      ResponseUtil.success(res, stats, 'Customer stats retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };
}

