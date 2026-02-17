// src/modules/susu-accounts/susu-accounts.validation.ts
import Joi from 'joi';

export const susuAccountsValidation = {
  create: Joi.object({
    customerId: Joi.string().uuid().required(),
    susuPlanId: Joi.string().uuid().required(),
    targetAmount: Joi.number().positive().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
  }),

  update: Joi.object({
    targetAmount: Joi.number().positive().optional(),
    endDate: Joi.date().optional(),
    isActive: Joi.boolean().optional(),
  }),

  withdraw: Joi.object({
    amount: Joi.number().positive().required(),
  }),

  query: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    search: Joi.string().optional(),
    customerId: Joi.string().uuid().optional(),
    susuPlanId: Joi.string().uuid().optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),

  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

