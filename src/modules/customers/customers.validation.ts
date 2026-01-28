import Joi from 'joi';

export const customersValidation = {
  create: Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    phone: Joi.string().required(),

    email: Joi.string()
      .email()
      .allow('', null)
      .optional(),

    address: Joi.string()
      .allow('', null)
      .optional(),

    idNumber: Joi.string()
      .allow('', null)
      .optional(),

    branchId: Joi.string().uuid().required(),
  }),

  update: Joi.object({
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    phone: Joi.string().optional(),

    email: Joi.string()
      .email()
      .allow('', null)
      .optional(),

    address: Joi.string()
      .allow('', null)
      .optional(),

    idNumber: Joi.string()
      .allow('', null)
      .optional(),

    branchId: Joi.string().uuid().optional(),
    isActive: Joi.boolean().optional(),
  }),

  query: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    search: Joi.string().optional(),
    branchId: Joi.string().uuid().optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),

  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};
