// src/modules/susu-accounts/susu-accounts.controller.ts
import { Response, NextFunction } from 'express';
import { SusuAccountsService } from './susu-accounts.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';

export class SusuAccountsController {
  private susuAccountsService: SusuAccountsService;

  constructor() {
    this.susuAccountsService = new SusuAccountsService();
  }

  create = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Super admin needs to specify companyId in request body
      const companyId = req.user!.companyId || req.body.companyId;

      if (!companyId) {
        ResponseUtil.badRequest(res, 'Company ID is required');
        return;
      }

      const account = await this.susuAccountsService.create(
        companyId,
        req.body,
        req.user!.id
      );
      ResponseUtil.created(res, account, 'Susu account created successfully');
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
      const companyId = req.user!.companyId;  // Can be null for SUPER_ADMIN
      const result = await this.susuAccountsService.getAll(
        companyId,
        req.query,
        req.user!.role,
        // ✅ FIX: Pass userId so service can look up AgentBranchAssignment
        req.user!.id
      );
      ResponseUtil.success(res, result, 'Susu accounts retrieved successfully');
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
      const companyId = req.user!.companyId;  // Can be null for SUPER_ADMIN
      const account = await this.susuAccountsService.getById(
        req.params.id,
        companyId,
        req.user!.role,
        // ✅ FIX: Pass userId so service can look up AgentBranchAssignment
        req.user!.id
      );
      ResponseUtil.success(res, account, 'Susu account retrieved successfully');
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
      const companyId = req.user!.companyId;  // Can be null for SUPER_ADMIN
      const account = await this.susuAccountsService.update(
        req.params.id,
        companyId,
        req.body,
        req.user!.id
      );
      ResponseUtil.success(res, account, 'Susu account updated successfully');
    } catch (error: any) {
      next(error);
    }
  };

  withdraw = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId;  // Can be null for SUPER_ADMIN
      const result = await this.susuAccountsService.withdraw(
        req.params.id,
        companyId,
        req.body.amount,
        req.user!.id
      );
      ResponseUtil.success(res, result, 'Withdrawal successful');
    } catch (error: any) {
      next(error);
    }
  };

  getTransactions = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId;  // Can be null for SUPER_ADMIN
      const result = await this.susuAccountsService.getTransactions(
        req.params.id,
        companyId,
        req.query
      );
      ResponseUtil.success(res, result, 'Transactions retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };
}