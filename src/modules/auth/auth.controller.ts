// src/modules/auth/auth.controller.ts
import { Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      ResponseUtil.created(res, result, 'Registration successful');
    } catch (error: any) {
      next(error);
    }
  };

  login = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await this.authService.login(email, password, ipAddress, userAgent);
      ResponseUtil.success(res, result, 'Login successful');
    } catch (error: any) {
      next(error);
    }
  };

  refreshToken = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const tokens = await this.authService.refreshToken(refreshToken);
      ResponseUtil.success(res, tokens, 'Token refreshed successfully');
    } catch (error: any) {
      next(error);
    }
  };

  logout = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { refreshToken } = req.body;
      const result = await this.authService.logout(userId, refreshToken);
      ResponseUtil.success(res, result, 'Logout successful');
    } catch (error: any) {
      next(error);
    }
  };

  changePassword = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;
      const result = await this.authService.changePassword(
        userId,
        currentPassword,
        newPassword
      );
      ResponseUtil.success(res, result, 'Password changed successfully');
    } catch (error: any) {
      next(error);
    }
  };

  getProfile = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const profile = await this.authService.getProfile(userId);
      ResponseUtil.success(res, profile, 'Profile retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };

  updateProfile = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const profile = await this.authService.updateProfile(userId, req.body);
      ResponseUtil.success(res, profile, 'Profile updated successfully');
    } catch (error: any) {
      next(error);
    }
  };
}