// src/middleware/tenant.middleware.ts
import { Response, NextFunction } from 'express';
import { IAuthRequest } from '../types/interfaces';
import { ResponseUtil } from '../utils/response.util';
import { UserRole } from '../types/enums';

export class TenantMiddleware {
  /**
   * Validate that user has access to the company
   * Super admins can access any company
   * Company admins and agents can only access their own company
   */
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
        console.log('✅ Super admin access granted - no company restriction');
        return next();
      }

      // Company admin and agents must have a company
      if (!user.companyId) {
        console.warn('❌ User has no company association:', user.email);
        ResponseUtil.forbidden(
          res,
          'User is not associated with any company'
        );
        return;
      }

      // If route has a company ID parameter, validate user has access to it
      const routeCompanyId = req.params.id || req.params.companyId;
      if (routeCompanyId && routeCompanyId !== user.companyId) {
        console.warn(
          `❌ Access denied: User trying to access different company. User company: ${user.companyId}, Requested: ${routeCompanyId}`
        );
        ResponseUtil.forbidden(
          res,
          'Access denied to this company'
        );
        return;
      }

      // Set company context for the request (for easy access in controllers)
      req.companyId = user.companyId;

      console.log(`✅ Company access validated for user: ${user.email}, company: ${user.companyId}`);
      next();
    } catch (error) {
      console.error('Tenant validation error:', error);
      ResponseUtil.error(res, 'Tenant validation error');
    }
  }

  /**
   * Validate that user has access to the branch
   * Super admins and company admins can access any branch
   * Agents can only access their assigned branch
   */
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
        console.log('✅ Admin access granted - no branch restriction');
        return next();
      }

      // Agents must have a branch assigned
      if (!user.branchId) {
        console.warn('❌ Agent has no branch assignment:', user.email);
        ResponseUtil.forbidden(res, 'User is not assigned to any branch');
        return;
      }

      // If route has a branch ID parameter, validate agent has access to it
      const routeBranchId = req.params.branchId || req.body.branchId;
      if (routeBranchId && routeBranchId !== user.branchId) {
        console.warn(
          `❌ Access denied: Agent trying to access different branch. User branch: ${user.branchId}, Requested: ${routeBranchId}`
        );
        ResponseUtil.forbidden(
          res,
          'Access denied to this branch'
        );
        return;
      }

      // Set branch context for the request
      req.branchId = user.branchId;

      console.log(`✅ Branch access validated for user: ${user.email}, branch: ${user.branchId}`);
      next();
    } catch (error) {
      console.error('Branch validation error:', error);
      ResponseUtil.error(res, 'Branch validation error');
    }
  }

  /**
   * Scope request data to user's company (for queries and filtering)
   * This is useful for ensuring data queries are automatically filtered by company
   */
  static scopeToCompany(
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

      // Super admin doesn't need scoping
      if (user.role === UserRole.SUPER_ADMIN) {
        console.log('✅ Super admin - no company scoping applied');
        return next();
      }

      // Add company ID to request context
      req.companyId = user.companyId!;

      // Optionally add company filter to query parameters
      if (req.query && !req.query.companyId) {
        (req.query as any).companyId = user.companyId!;
      }

      console.log(`✅ Request scoped to company: ${user.companyId}`);
      next();
    } catch (error) {
      console.error('Company scoping error:', error);
      ResponseUtil.error(res, 'Company scoping error');
    }
  }

  /**
   * Validate user can only access their own data (for agents)
   * Used for endpoints where agents should only see their own records
   */
  static validateOwnDataAccess(
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

      // Super admin and company admin can access all data
      if (
        user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.COMPANY_ADMIN
      ) {
        return next();
      }

      // For agents, ensure they're only accessing their own data
      const requestedUserId = req.params.userId || req.params.agentId || req.body.agentId;
      if (requestedUserId && requestedUserId !== user.id) {
        console.warn(
          `❌ Access denied: Agent trying to access another user's data. User: ${user.id}, Requested: ${requestedUserId}`
        );
        ResponseUtil.forbidden(
          res,
          'You can only access your own data'
        );
        return;
      }

      next();
    } catch (error) {
      console.error('Own data access validation error:', error);
      ResponseUtil.error(res, 'Access validation error');
    }
  }
}