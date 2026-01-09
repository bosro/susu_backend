// src/modules/branches/branches.validation.ts
import Joi from 'joi';

export const branchesValidation = {
  create: Joi.object({
    name: Joi.string().required(),
    address: Joi.string().optional(),
    phone: Joi.string().optional(),
  }),

  update: Joi.object({
    name: Joi.string().optional(),
    address: Joi.string().optional(),
    phone: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
  }),

  query: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    search: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),

  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};