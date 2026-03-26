// src/modules/inventory/inventory.validation.ts

import Joi from 'joi';

export const inventoryValidation = {
  // ── Item ──────────────────────────────────────────────────────
  createItem: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow('', null).optional(),
    category: Joi.string().allow('', null).optional(),
    sku: Joi.string().allow('', null).optional(),
    unit: Joi.string().allow('', null).optional(),
    imageUrl: Joi.string().uri().allow('', null).optional(),
    costPrice: Joi.number().min(0).required(),
    sellingPrice: Joi.number().min(0).required(),
    quantityInStock: Joi.number().integer().min(0).optional(),
    lowStockThreshold: Joi.number().integer().min(0).allow(null).optional(),
    status: Joi.string()
      .valid('ACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK')
      .optional(),
  }),

  updateItem: Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().allow('', null).optional(),
    category: Joi.string().allow('', null).optional(),
    sku: Joi.string().allow('', null).optional(),
    unit: Joi.string().allow('', null).optional(),
    imageUrl: Joi.string().uri().allow('', null).optional(),
    costPrice: Joi.number().min(0).optional(),
    sellingPrice: Joi.number().min(0).optional(),
    lowStockThreshold: Joi.number().integer().min(0).allow(null).optional(),
    status: Joi.string()
      .valid('ACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK')
      .optional(),
  }),

  itemQuery: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    search: Joi.string().optional(),
    category: Joi.string().optional(),
    status: Joi.string()
      .valid('ACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK')
      .optional(),
    lowStock: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),

  // ── Sale ─────────────────────────────────────────────────────
  createSale: Joi.object({
    inventoryItemId: Joi.string().uuid().required(),
    quantitySold: Joi.number().integer().min(1).required(),
    salePricePerUnit: Joi.number().min(0).required(),
    buyerName: Joi.string().allow('', null).optional(),
    buyerContact: Joi.string().allow('', null).optional(),
    notes: Joi.string().allow('', null).optional(),
    saleDate: Joi.date().optional(),
  }),

  saleQuery: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    inventoryItemId: Joi.string().uuid().optional(),
    agentId: Joi.string().uuid().optional(),
    status: Joi.string()
      .valid('COMPLETED', 'REFUNDED', 'CANCELLED')
      .optional(),
    startDate: Joi.string().optional(),
    endDate: Joi.string().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),

  // ── Restock ──────────────────────────────────────────────────
  createRestock: Joi.object({
    quantityAdded: Joi.number().integer().min(1).required(),
    costPerUnit: Joi.number().min(0).required(),
    supplier: Joi.string().allow('', null).optional(),
    notes: Joi.string().allow('', null).optional(),
    restockDate: Joi.date().optional(),
  }),

  restockQuery: Joi.object({
    page: Joi.number().min(1).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),

  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};
