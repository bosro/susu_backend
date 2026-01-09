// src/modules/susu-plans/susu-plans.validation.ts
import Joi from 'joi';
import { SusuPlanType } from '../../types/enums';

export const susuPlansValidation = {
  create: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    type: Joi.string()
      .valid(...Object.values(SusuPlanType))
      .required(),
    amount: Joi.number().positive().required(),
    frequency: Joi.string().optional(),
    duration: Joi.number().positive().optional(),
    targetAmount: Joi.number().positive().optional(),
  }),

  update: Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    type: Joi.string()
      .valid(...Object.values(SusuPlanType))
      .optional(),
    amount: Joi.number().positive().optional(),
    frequency: Joi.string().optional(),
    duration: Joi.number().positive().optional(),
    targetAmount: Joi.number().positive().optional(),
    isActive: Joi.boolean().optional(),
  }),

  query: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    search: Joi.string().optional(),
    type: Joi.string()
      .valid(...Object.values(SusuPlanType))
      .optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),

  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};