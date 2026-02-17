// src/modules/users/users.validation.ts
import Joi from "joi";
import { UserRole } from "../../types/enums";

export const usersValidation = {
  create: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    phone: Joi.string().optional(),
    role: Joi.string().valid(UserRole.AGENT, UserRole.COMPANY_ADMIN).required(),
    branchIds: Joi.array().items(Joi.string().uuid()).optional().default([]),
    branchId: Joi.string().uuid().optional(),
    photoUrl: Joi.string().uri().optional(), // ✅ NEW
    photoPublicId: Joi.string().optional(), // ✅ NEW
  }).custom((value) => {
    if (
      value.branchId !== undefined &&
      (!value.branchIds || value.branchIds.length === 0)
    ) {
      value.branchIds = value.branchId ? [value.branchId] : [];
    }
    delete value.branchId;
    return value;
  }),

  update: Joi.object({
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    phone: Joi.string().optional(),
    branchIds: Joi.array().items(Joi.string().uuid()).optional().default([]),
    branchId: Joi.string().uuid().optional(),

    isActive: Joi.boolean().optional(),
    photoUrl: Joi.string().uri().optional().allow(null, ""), // ✅ NEW
    photoPublicId: Joi.string().optional().allow(null, ""), // ✅ NEW
  }).custom((value) => {
    if (
      value.branchId !== undefined &&
      (!value.branchIds || value.branchIds.length === 0)
    ) {
      value.branchIds = value.branchId ? [value.branchId] : [];
    }
    delete value.branchId;
    return value;
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
    sortOrder: Joi.string().valid("asc", "desc").optional(),
  }),

  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};


