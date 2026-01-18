// src/modules/users/users.controller.ts
import { Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';

export class UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = new UsersService();
  }

  // ✅ Arrow function to preserve 'this' context
  create = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // ✅ Allow null for SUPER_ADMIN, but they must specify companyId in body
      const companyId = req.user!.companyId || req.body.companyId;
      
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      const user = await this.usersService.create(
        companyId,
        req.body,
        req.user!.id
      );
      ResponseUtil.created(res, user, 'User created successfully');
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ Arrow function to preserve 'this' context
  getAll = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // ✅ Allow null for SUPER_ADMIN
      const companyId = req.user!.companyId || null;
      const result = await this.usersService.getAll(companyId, req.query);
      ResponseUtil.success(res, result, 'Users retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ Arrow function to preserve 'this' context
  getById = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // ✅ Allow null for SUPER_ADMIN
      const companyId = req.user!.companyId || null;
      const user = await this.usersService.getById(req.params.id, companyId);
      ResponseUtil.success(res, user, 'User retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ Arrow function to preserve 'this' context
  update = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // ✅ Allow null for SUPER_ADMIN
      const companyId = req.user!.companyId || null;
      const user = await this.usersService.update(
        req.params.id,
        companyId,
        req.body,
        req.user!.id
      );
      ResponseUtil.success(res, user, 'User updated successfully');
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ Arrow function to preserve 'this' context
  delete = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // ✅ Allow null for SUPER_ADMIN
      const companyId = req.user!.companyId || null;
      const result = await this.usersService.delete(
        req.params.id,
        companyId,
        req.user!.id
      );
      ResponseUtil.success(res, result, 'User deleted successfully');
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ Arrow function to preserve 'this' context
  resetPassword = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // ✅ Allow null for SUPER_ADMIN
      const companyId = req.user!.companyId || null;
      const result = await this.usersService.resetPassword(
        req.params.id,
        companyId,
        req.body.newPassword,
        req.user!.id
      );
      ResponseUtil.success(res, result, 'Password reset successfully');
    } catch (error: any) {
      next(error);
    }
  };
}