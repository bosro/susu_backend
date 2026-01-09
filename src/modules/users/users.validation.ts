// src/modules/users/users.validation.ts
import Joi from 'joi';
import { UserRole } from '../../types/enums';

export const usersValidation = {
  create: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    phone: Joi.string().optional(),
    role: Joi.string()
      .valid(UserRole.AGENT, UserRole.COMPANY_ADMIN)
      .required(),
    branchId: Joi.string().uuid().optional(),
  }),

  update: Joi.object({
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    phone: Joi.string().optional(),
    branchId: Joi.string().uuid().optional().allow(null),
    isActive: Joi.boolean().optional(),
  }),

  query: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    search: Joi.string().optional(),
    role: Joi.string()
      .valid(...Object.values(UserRole))
      .optional(),
    branchId: Joi.string().uuid().optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),

  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};