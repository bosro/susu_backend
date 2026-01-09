// src/modules/companies/companies.validation.ts
import Joi from 'joi';
import { CompanyStatus } from '../../types/enums';

export const companiesValidation = {
  update: Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    address: Joi.string().optional(),
    primaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    secondaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  }),

  updateStatus: Joi.object({
    status: Joi.string()
      .valid(...Object.values(CompanyStatus))
      .required(),
  }),

  query: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    search: Joi.string().optional(),
    status: Joi.string()
      .valid(...Object.values(CompanyStatus))
      .optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),

  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};