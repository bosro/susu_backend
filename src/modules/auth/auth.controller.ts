// src/modules/auth/auth.controller.ts - ADD missing controllers
import { Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { ResponseUtil } from "../../utils/response.util";
import { IAuthRequest } from "../../types/interfaces";
import { EmailService } from "../../services/email.service";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  cleanupTokens = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (req.user?.role !== "SUPER_ADMIN") {
        ResponseUtil.forbidden(res, "Access denied");
        return;
      }

      const count = await this.authService.cleanupExpiredTokens();
      ResponseUtil.success(
        res,
        { count },
        `Cleaned up ${count} expired tokens`,
      );
    } catch (error: any) {
      next(error);
    }
  };

  register = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      ResponseUtil.created(res, result, "Registration successful");
    } catch (error: any) {
      next(error);
    }
  };

  login = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers["user-agent"];

      const result = await this.authService.login(
        email,
        password,
        ipAddress,
        userAgent,
      );
      ResponseUtil.success(res, result, "Login successful");
    } catch (error: any) {
      next(error);
    }
  };

  refreshToken = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const tokens = await this.authService.refreshToken(refreshToken);
      ResponseUtil.success(res, tokens, "Token refreshed successfully");
    } catch (error: any) {
      next(error);
    }
  };

  logout = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { refreshToken } = req.body;
      const result = await this.authService.logout(userId, refreshToken);
      ResponseUtil.success(res, result, "Logout successful");
    } catch (error: any) {
      next(error);
    }
  };

  changePassword = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;
      const result = await this.authService.changePassword(
        userId,
        currentPassword,
        newPassword,
      );
      ResponseUtil.success(res, result, "Password changed successfully");
    } catch (error: any) {
      next(error);
    }
  };

  getProfile = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const profile = await this.authService.getProfile(userId);
      ResponseUtil.success(res, profile, "Profile retrieved successfully");
    } catch (error: any) {
      next(error);
    }
  };

  updateProfile = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const profile = await this.authService.updateProfile(userId, req.body);
      ResponseUtil.success(res, profile, "Profile updated successfully");
    } catch (error: any) {
      next(error);
    }
  };

  // ✅ NEW: Missing controllers
  forgotPassword = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { email } = req.body;
      // Implement forgot password logic in AuthService
      const result = await this.authService.forgotPassword(email);
      ResponseUtil.success(res, result, "Password reset email sent");
    } catch (error: any) {
      next(error);
    }
  };

  resetPassword = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { token, newPassword } = req.body;
      // Implement reset password logic in AuthService
      const result = await this.authService.resetPassword({
        token,
        newPassword,
        confirmPassword: newPassword,
      });
      ResponseUtil.success(res, result, "Password reset successfully");
    } catch (error: any) {
      next(error);
    }
  };

  verifyResetToken = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { token } = req.body;
      const result = await this.authService.verifyResetToken({ token });
      ResponseUtil.success(res, result, "Token verified successfully");
    } catch (error: any) {
      next(error);
    }
  };

  adminResetUserPassword = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (req.user?.role !== "SUPER_ADMIN") {
        ResponseUtil.forbidden(res, "Access denied");
        return;
      }

      const { userId, newPassword } = req.body;
      const result = await this.authService.adminResetUserPassword(
        userId,
        newPassword,
      );
      ResponseUtil.success(res, result, "User password reset successfully");
    } catch (error: any) {
      next(error);
    }
  };

  verifyEmailService = async (
    _req: IAuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const isConnected = await EmailService.verifyConnection();

      if (isConnected) {
        ResponseUtil.success(
          res,
          { connected: true },
          "Email service is working",
        );
      } else {
        ResponseUtil.error(res, "Email service is not configured properly");
      }
    } catch (error: any) {
      next(error);
    }
  };
}
