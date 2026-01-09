// src/middleware/auth.middleware.ts
import { Response, NextFunction } from 'express';
import { JWTUtil } from '../utils/jwt.util';
import { ResponseUtil } from '../utils/response.util';
import { IAuthRequest } from '../types/interfaces';
import { UserRole } from '../types/enums';
import { prisma } from '../config/database';

export class AuthMiddleware {
  static async authenticate(
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ResponseUtil.unauthorized(res, 'No token provided');
        return;
      }

      const token = authHeader.substring(7);

      try {
        const decoded = JWTUtil.verifyAccessToken(token);

        // Verify user still exists and is active
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            companyId: true,
            branchId: true,
            isActive: true,
          },
        });

        if (!user || !user.isActive) {
          ResponseUtil.unauthorized(res, 'User not found or inactive');
          return;
        }

        req.user = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role as UserRole,
          companyId: user.companyId,
          branchId: user.branchId,
        };

        next();
      } catch (error) {
        ResponseUtil.unauthorized(res, 'Invalid or expired token');
        return;
      }
    } catch (error) {
      ResponseUtil.error(res, 'Authentication error');
    }
  }

  static authorize(...roles: UserRole[]) {
    return (req: IAuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        ResponseUtil.unauthorized(res, 'User not authenticated');
        return;
      }

      if (!roles.includes(req.user.role)) {
        ResponseUtil.forbidden(
          res,
          'You do not have permission to perform this action'
        );
        return;
      }

      next();
    };
  }

  static optionalAuth(
    req: IAuthRequest,
    _res: Response,
    next: NextFunction
  ): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = JWTUtil.verifyAccessToken(token);
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        firstName: '',
        lastName: '',
        role: decoded.role,
        companyId: decoded.companyId,
        branchId: decoded.branchId,
      };
    } catch {
      // Invalid token, but we don't throw error for optional auth
    }

    next();
  }
}