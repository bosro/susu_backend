// src/modules/notifications/notifications.service.ts
import { prisma } from '../../config/database';
import { PaginationUtil } from '../../utils/pagination.util';
import { NotificationType, UserRole } from '../../types/enums';
import { IPaginationQuery } from '../../types/interfaces';

export class NotificationsService {
  async create(
    companyId: string,
    data: {
      userId?: string;
      title: string;
      message: string;
      type: NotificationType;
      data?: any;
    },
    createdBy: string
  ) {
    // If userId is provided, validate it belongs to the company
    if (data.userId) {
      const user = await prisma.user.findFirst({
        where: { id: data.userId, companyId },
      });

      if (!user) {
        throw new Error('User not found');
      }
    }

    const notification = await prisma.notification.create({
      data: {
        companyId,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        data: data.data,
        createdBy,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return notification;
  }

  async createBulk(
    companyId: string,
    data: {
      userIds?: string[];
      title: string;
      message: string;
      type: NotificationType;
      data?: any;
    },
    createdBy: string
  ) {
    const notifications = [];

    if (data.userIds && data.userIds.length > 0) {
      // Create notifications for specific users
      for (const userId of data.userIds) {
        const notification = await this.create(
          companyId,
          {
            userId,
            title: data.title,
            message: data.message,
            type: data.type,
            data: data.data,
          },
          createdBy
        );
        notifications.push(notification);
      }
    } else {
      // Create notification for all company users
      const users = await prisma.user.findMany({
        where: { companyId, isActive: true },
        select: { id: true },
      });

      for (const user of users) {
        const notification = await this.create(
          companyId,
          {
            userId: user.id,
            title: data.title,
            message: data.message,
            type: data.type,
            data: data.data,
          },
          createdBy
        );
        notifications.push(notification);
      }
    }

    return {
      message: 'Notifications sent successfully',
      count: notifications.length,
    };
  }

  async getAll(
    companyId: string,
    userId: string,
    query: IPaginationQuery,
    userRole: UserRole
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = { companyId };

    // Non-admin users can only see their own notifications
    if (userRole !== UserRole.COMPANY_ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      where.userId = userId;
    }

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    if (query.type) {
      where.type = query.type;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return PaginationUtil.formatPaginationResult(notifications, total, page, limit);
  }

  async getById(id: string, companyId: string, userId: string, userRole: UserRole) {
    const where: any = { id, companyId };

    // Non-admin users can only see their own notifications
    if (userRole !== UserRole.COMPANY_ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      where.userId = userId;
    }

    const notification = await prisma.notification.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification;
  }

  async markAsRead(
    notificationIds: string[],
    companyId: string,
    userId: string,
    userRole: UserRole
  ) {
    const where: any = {
      id: { in: notificationIds },
      companyId,
    };

    // Non-admin users can only mark their own notifications as read
    if (userRole !== UserRole.COMPANY_ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      where.userId = userId;
    }

    const updated = await prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    return {
      message: 'Notifications marked as read',
      count: updated.count,
    };
  }

  async markAllAsRead(companyId: string, userId: string, userRole: UserRole) {
    const where: any = { companyId, isRead: false };

    // Non-admin users can only mark their own notifications as read
    if (userRole !== UserRole.COMPANY_ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      where.userId = userId;
    }

    const updated = await prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    return {
      message: 'All notifications marked as read',
      count: updated.count,
    };
  }

  async delete(id: string, companyId: string, userId: string, userRole: UserRole) {
    const where: any = { id, companyId };

    // Non-admin users can only delete their own notifications
    if (userRole !== UserRole.COMPANY_ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      where.userId = userId;
    }

    const notification = await prisma.notification.findFirst({ where });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await prisma.notification.delete({ where: { id } });

    return { message: 'Notification deleted successfully' };
  }

  async getUnreadCount(companyId: string, userId: string, userRole: UserRole) {
    const where: any = { companyId, isRead: false };

    // Non-admin users can only see their own unread count
    if (userRole !== UserRole.COMPANY_ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      where.userId = userId;
    }

    const count = await prisma.notification.count({ where });

    return { unreadCount: count };
  }
}