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

  create = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
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

  getAll = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const result = await this.usersService.getAll(companyId, req.query);
      ResponseUtil.success(res, result, 'Users retrieved successfully');
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
      const user = await this.usersService.getById(req.params.id, companyId);
      ResponseUtil.success(res, user, 'User retrieved successfully');
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

  delete = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
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

  resetPassword = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
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

