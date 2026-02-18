// src/modules/subscriptions/subscriptions.validation.ts
import Joi from 'joi';

const VALID_PLANS = ['TRIAL', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
const VALID_STATUSES = ['ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED', 'PENDING'];

export const subscriptionsValidation = {
  activate: Joi.object({
    plan: Joi.string().valid(...VALID_PLANS).required(),
    amount: Joi.number().positive().optional(),
    notes: Joi.string().allow('').optional(),
    startDate: Joi.date().optional(),
  }),

  suspend: Joi.object({
    reason: Joi.string().min(5).max(500).required(),
  }),

  cancel: Joi.object({
    reason: Joi.string().allow('').optional(),
  }),

  query: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    status: Joi.string().valid(...VALID_STATUSES).optional(),
    plan: Joi.string().valid(...VALID_PLANS).optional(),
    expiringSoon: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),

  companyParams: Joi.object({
    companyId: Joi.string().uuid().required(),
  }),

  subscriptionParams: Joi.object({
    subscriptionId: Joi.string().uuid().required(),
  }),
};