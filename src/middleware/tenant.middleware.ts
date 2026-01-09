// src/middleware/tenant.middleware.ts
import { Response, NextFunction } from 'express';
import { IAuthRequest } from '../types/interfaces';
import { ResponseUtil } from '../utils/response.util';
import { UserRole } from '../types/enums';

export class TenantMiddleware {
  static validateCompanyAccess(
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): void {
    try {
      const user = req.user;

      if (!user) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      // Super admin can access all companies
      if (user.role === UserRole.SUPER_ADMIN) {
        return next();
      }

      // Company admin and agents must have a company
      if (!user.companyId) {
        ResponseUtil.forbidden(
          res,
          'User is not associated with any company'
        );
        return;
      }

      // Set company context for the request
      req.companyId = user.companyId;

      next();
    } catch (error) {
      ResponseUtil.error(res, 'Tenant validation error');
    }
  }

  static validateBranchAccess(
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): void {
    try {
      const user = req.user;

      if (!user) {
        ResponseUtil.unauthorized(res, 'Authentication required');
        return;
      }

      // Super admin and company admin can access all branches
      if (
        user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.COMPANY_ADMIN
      ) {
        return next();
      }

      // Agents must have a branch assigned
      if (!user.branchId) {
        ResponseUtil.forbidden(res, 'User is not assigned to any branch');
        return;
      }

      next();
    } catch (error) {
      ResponseUtil.error(res, 'Branch validation error');
    }
  }
}