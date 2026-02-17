// src/modules/daily-summaries/daily-summaries.validation.ts
import Joi from 'joi';

export const dailySummariesValidation = {
  create: Joi.object({
    branchId: Joi.string().uuid().required(),
    date: Joi.date().required(),
    totalExpected: Joi.number().min(0).required(),
    totalCollected: Joi.number().min(0).required(),
    totalCustomers: Joi.number().integer().min(0).required(),
    collectionsCount: Joi.number().integer().min(0).required(),
    missedCount: Joi.number().integer().min(0).required(),
    notes: Joi.string().optional(),
  }),

  update: Joi.object({
    notes: Joi.string().allow('').optional(),
    isLocked: Joi.boolean().optional(),
  }),

  query: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    branchId: Joi.string().uuid().optional(),
    agentId: Joi.string().uuid().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    isLocked: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),

  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  // ✅ FIXED: branchId is optional here — agents get it from their JWT,
  // admins must send it in the body. Controller handles the role-based logic.
  generateParams: Joi.object({
    date: Joi.date().required(),
    branchId: Joi.string().uuid().optional(),
  }),
};