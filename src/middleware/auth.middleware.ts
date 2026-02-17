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

        // ✅ Verify user still exists and is active
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            companyId: true,
            isActive: true,
            company: {
              select: {
                status: true,
              },
            },
          },
        });

        if (!user) {
          console.warn('❌ Auth middleware: User not found:', decoded.userId);
          ResponseUtil.unauthorized(res, 'User not found');
          return;
        }

        if (!user.isActive) {
          console.warn('❌ Auth middleware: User is inactive:', user.email);
          ResponseUtil.unauthorized(res, 'User account is inactive');
          return;
        }

        // ✅ Check if company is active (for non-super admins)
        if (user.role !== UserRole.SUPER_ADMIN && 
            user.company && 
            user.company.status !== 'ACTIVE') {
          console.warn('❌ Auth middleware: Company is not active:', user.company.status);
          ResponseUtil.unauthorized(res, 'Company account is not active');
          return;
        }

        req.user = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role as UserRole,
          companyId: user.companyId,
          branchId: null, // ✅ Always null now - branches handled via assignedBranches
        };

        next();
      } catch (error: any) {
        console.error('❌ Token verification error:', error.message);
        // ✅ More specific error messages
        if (error.message.includes('expired')) {
          ResponseUtil.unauthorized(res, 'Token has expired');
        } else {
          ResponseUtil.unauthorized(res, 'Invalid token');
        }
        return;
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      ResponseUtil.error(res, 'Authentication error');
    }
  }

  static authorize(...roles: UserRole[]) {
    return (req: IAuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        ResponseUtil.unauthorized(res, 'User not authenticated');
        return;
      }

      // ✅ Super admin can access everything
      if (req.user.role === UserRole.SUPER_ADMIN) {
        console.log('✅ Auth middleware: Super admin access granted');
        return next();
      }

      if (!roles.includes(req.user.role)) {
        console.warn(
          `❌ Auth middleware: Access denied for role "${req.user.role}". Required roles:`,
          roles
        );
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
        branchId: null, // ✅ Always null now
      };
    } catch {
      // Invalid token, but we don't throw error for optional auth
    }

    next();
  }
}

