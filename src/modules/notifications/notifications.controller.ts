// src/modules/notifications/notifications.controller.ts
import { Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';

export class NotificationsController {
  private notificationsService: NotificationsService;

  constructor() {
    this.notificationsService = new NotificationsService();
  }

  create = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const notification = await this.notificationsService.create(
        companyId,
        req.body,
        req.user!.id
      );
      ResponseUtil.created(res, notification, 'Notification created successfully');
    } catch (error: any) {
      next(error);
    }
  };

  createBulk = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const result = await this.notificationsService.createBulk(
        companyId,
        req.body,
        req.user!.id
      );
      ResponseUtil.created(res, result, 'Notifications sent successfully');
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
      const result = await this.notificationsService.getAll(
        companyId,
        req.user!.id,
        req.query,
        req.user!.role
      );
      ResponseUtil.success(res, result, 'Notifications retrieved successfully');
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
      const notification = await this.notificationsService.getById(
        req.params.id,
        companyId,
        req.user!.id,
        req.user!.role
      );
      ResponseUtil.success(res, notification, 'Notification retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };

  markAsRead = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const result = await this.notificationsService.markAsRead(
        req.body.notificationIds,
        companyId,
        req.user!.id,
        req.user!.role
      );
      ResponseUtil.success(res, result, 'Notifications marked as read');
    } catch (error: any) {
      next(error);
    }
  };

  markAllAsRead = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const result = await this.notificationsService.markAllAsRead(
        companyId,
        req.user!.id,
        req.user!.role
      );
      ResponseUtil.success(res, result, 'All notifications marked as read');
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
      const result = await this.notificationsService.delete(
        req.params.id,
        companyId,
        req.user!.id,
        req.user!.role
      );
      ResponseUtil.success(res, result, 'Notification deleted successfully');
    } catch (error: any) {
      next(error);
    }
  };

  getUnreadCount = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const result = await this.notificationsService.getUnreadCount(
        companyId,
        req.user!.id,
        req.user!.role
      );
      ResponseUtil.success(res, result, 'Unread count retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };
}