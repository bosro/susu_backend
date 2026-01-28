// src/modules/collections/collections.validation.ts
import Joi from 'joi';
import { CollectionStatus } from '../../types/enums';

export const collectionsValidation = {
  create: Joi.object({
    branchId: Joi.string().uuid().required(),
    customerId: Joi.string().uuid().required(),
    susuAccountId: Joi.string().uuid().required(),
    amount: Joi.number().positive().required(),
    expectedAmount: Joi.number()
      .positive()
      .allow(null)
      .optional(),
    collectionDate: Joi.date().optional(),
    status: Joi.string()
      .valid(...Object.values(CollectionStatus))
      .optional(),
    notes: Joi.string().allow('').optional(),
    latitude: Joi.string().allow('').optional(),
    longitude: Joi.string().allow('').optional(),
  }),

  update: Joi.object({
    amount: Joi.number().positive().optional(),
    status: Joi.string()
      .valid(...Object.values(CollectionStatus))
      .optional(),
    notes: Joi.string().allow('').optional(),
  }),

  query: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    search: Joi.string().optional(),
    customerId: Joi.string().uuid().optional(),
    branchId: Joi.string().uuid().optional(),
    agentId: Joi.string().uuid().optional(),
    status: Joi.string()
      .valid(...Object.values(CollectionStatus))
      .optional(),
    startDate: Joi.string().optional(),  // ✅ Changed from Joi.date() to Joi.string()
    endDate: Joi.string().optional(),    // ✅ Changed from Joi.date() to Joi.string()
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),

  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};