// src/modules/inventory/inventory.controller.ts

import { Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';
import { ResponseUtil } from '../../utils/response.util';
import { IAuthRequest } from '../../types/interfaces';

export class InventoryController {
  private inventoryService: InventoryService;

  constructor() {
    this.inventoryService = new InventoryService();
  }

  // ── Overview ──────────────────────────────────────────────────
  getOverview = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const overview = await this.inventoryService.getInventoryOverview(companyId);
      ResponseUtil.success(res, overview, 'Inventory overview retrieved');
    } catch (error: any) {
      next(error);
    }
  };

  // ── Items ─────────────────────────────────────────────────────
  createItem = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const item = await this.inventoryService.createItem(companyId, req.body, req.user!.id);
      ResponseUtil.created(res, item, 'Inventory item created successfully');
    } catch (error: any) {
      next(error);
    }
  };

  getAllItems = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const result = await this.inventoryService.getAllItems(companyId, req.query);
      ResponseUtil.success(res, result, 'Inventory items retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };

  getItemById = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const item = await this.inventoryService.getItemById(req.params.id, companyId);
      ResponseUtil.success(res, item, 'Inventory item retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };

  updateItem = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const item = await this.inventoryService.updateItem(
        req.params.id,
        companyId,
        req.body,
        req.user!.id,
      );
      ResponseUtil.success(res, item, 'Inventory item updated successfully');
    } catch (error: any) {
      next(error);
    }
  };

  deleteItem = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const result = await this.inventoryService.deleteItem(
        req.params.id,
        companyId,
        req.user!.id,
      );
      ResponseUtil.success(res, result, 'Inventory item deleted successfully');
    } catch (error: any) {
      next(error);
    }
  };

  // ── Sales ─────────────────────────────────────────────────────
  recordSale = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId!;
      const sale = await this.inventoryService.recordSale(
        companyId,
        req.user!.id,
        req.body,
      );
      ResponseUtil.created(res, sale, 'Sale recorded successfully');
    } catch (error: any) {
      next(error);
    }
  };

  getAllSales = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const result = await this.inventoryService.getAllSales(companyId, req.query);
      ResponseUtil.success(res, result, 'Sales retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };

  getSalesStats = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const stats = await this.inventoryService.getSalesStats(companyId, req.query);
      ResponseUtil.success(res, stats, 'Sales stats retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };

  // ── Restocks ──────────────────────────────────────────────────
  restockItem = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const restock = await this.inventoryService.restockItem(
        req.params.id,
        companyId,
        req.body,
        req.user!.id,
      );
      ResponseUtil.created(res, restock, 'Item restocked successfully');
    } catch (error: any) {
      next(error);
    }
  };

  getRestockHistory = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const result = await this.inventoryService.getRestockHistory(
        req.params.id,
        companyId,
        req.query,
      );
      ResponseUtil.success(res, result, 'Restock history retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  };
}




