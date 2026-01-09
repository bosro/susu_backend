// src/modules/notifications/notifications.validation.ts
import Joi from 'joi';
import { NotificationType } from '../../types/enums';

export const notificationsValidation = {
  create: Joi.object({
    userId: Joi.string().uuid().optional(),
    title: Joi.string().required(),
    message: Joi.string().required(),
    type: Joi.string()
      .valid(...Object.values(NotificationType))
      .required(),
    data: Joi.object().optional(),
  }),

  query: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    isRead: Joi.boolean().optional(),
    type: Joi.string()
      .valid(...Object.values(NotificationType))
      .optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),

  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  markAsRead: Joi.object({
    notificationIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  }),
};