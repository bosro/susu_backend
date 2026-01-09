// src/modules/reports/reports.validation.ts
import Joi from 'joi';

export const reportsValidation = {
  query: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    branchId: Joi.string().uuid().optional(),
    agentId: Joi.string().uuid().optional(),
    customerId: Joi.string().uuid().optional(),
    format: Joi.string().valid('json', 'csv', 'pdf').optional().default('json'),
  }),
};