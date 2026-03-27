// src/modules/inventory/inventory.service.ts

import { prisma } from "../../config/database";
import { PaginationUtil } from "../../utils/pagination.util";
import { AuditLogUtil } from "../../utils/audit-log.util";
import { AuditAction } from "../../types/enums";
import { IPaginationQuery } from "../../types/interfaces";

export class InventoryService {
  // ════════════════════════════════════════════════════════════════
  // ITEMS
  // ════════════════════════════════════════════════════════════════

  async createItem(
    companyId: string,
    data: {
      name: string;
      description?: string;
      category?: string;
      sku?: string;
      unit?: string;
      imageUrl?: string;
      costPrice: number;
      sellingPrice: number;
      quantityInStock?: number;
      lowStockThreshold?: number;
      status?: string;
    },
    createdBy: string,
  ) {
    console.log("📦 Creating inventory item:", { companyId, name: data.name });

    // Check for duplicate SKU within company
    if (data.sku) {
      const existing = await prisma.inventoryItem.findFirst({
        where: { companyId, sku: data.sku },
      });
      if (existing) {
        throw new Error(`An item with SKU "${data.sku}" already exists`);
      }
    }

    const item = await prisma.inventoryItem.create({
      data: {
        companyId,
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        sku: data.sku || null,
        unit: data.unit || "piece",
        imageUrl: data.imageUrl || null,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        quantityInStock: data.quantityInStock ?? 0,
        lowStockThreshold: data.lowStockThreshold ?? 5,
        status: (data.status as any) || "ACTIVE",
        createdBy,
      },
    });

    // If initial stock > 0, create a restock record to capture it
    if ((data.quantityInStock ?? 0) > 0) {
      await prisma.inventoryRestock.create({
        data: {
          companyId,
          inventoryItemId: item.id,
          quantityAdded: data.quantityInStock!,
          costPerUnit: data.costPrice,
          totalCost: data.costPrice * data.quantityInStock!,
          notes: "Initial stock",
          restockedBy: createdBy,
        },
      });
    }

    await AuditLogUtil.log({
      companyId,
      userId: createdBy,
      action: AuditAction.CREATE,
      entityType: "INVENTORY_ITEM",
      entityId: item.id,
      changes: data,
    });

    console.log("✅ Inventory item created:", item.id);
    return item;
  }

  async getAllItems(
    companyId: string | null,
    query: IPaginationQuery & {
      category?: string;
      status?: string;
      lowStock?: boolean;
    },
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = {};

    if (companyId !== null) {
      where.companyId = companyId;
    }

    if (query.category) {
      where.category = { contains: query.category, mode: "insensitive" };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.lowStock === true) {
      where.AND = [
        {
          lowStockThreshold: { not: null },
        },
        {
          quantityInStock: {
            lte: prisma.inventoryItem.fields.lowStockThreshold,
          },
        },
      ];
      // Simpler approach: filter in service after fetch since Prisma can't compare two fields
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { sku: { contains: query.search, mode: "insensitive" } },
        { category: { contains: query.search, mode: "insensitive" } },
      ];
    }

    // Remove the complex AND for lowStock — do it properly
    if (query.lowStock === true) {
      delete where.AND;
    }

    const validSortFields = [
      "name",
      "createdAt",
      "updatedAt",
      "quantityInStock",
      "costPrice",
      "sellingPrice",
      "category",
    ];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    let [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: query.lowStock ? undefined : limit, // fetch all if lowStock filter
        orderBy: { [safeSortBy]: sortOrder },
        include: {
          _count: {
            select: { sales: true, restocks: true },
          },
        },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    // Apply low-stock filter in-memory (comparing two fields)
    if (query.lowStock === true) {
      items = items.filter(
        (item) =>
          item.lowStockThreshold !== null &&
          item.quantityInStock <= item.lowStockThreshold,
      );
      total = items.length;
      // re-paginate
      items = items.slice(skip, skip + limit);
    }

    // Add computed fields
    const itemsWithComputed = items.map((item) => ({
      ...item,
      margin: Number(item.sellingPrice) - Number(item.costPrice),
      marginPct:
        Number(item.costPrice) > 0
          ? (
              ((Number(item.sellingPrice) - Number(item.costPrice)) /
                Number(item.costPrice)) *
              100
            ).toFixed(1)
          : "0",
      isLowStock:
        item.lowStockThreshold !== null &&
        item.quantityInStock <= item.lowStockThreshold,
      totalStockValue: Number(item.costPrice) * item.quantityInStock,
    }));

    console.log(`✅ Found ${items.length} inventory items`);
    return PaginationUtil.formatPaginationResult(
      itemsWithComputed,
      total,
      page,
      limit,
    );
  }

  async getItemById(id: string, companyId: string | null) {
    const where: any = { id };
    if (companyId !== null) where.companyId = companyId;

    const item = await prisma.inventoryItem.findFirst({
      where,
      include: {
        sales: {
          take: 10,
          orderBy: { saleDate: "desc" },
          include: {
            agent: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        restocks: {
          take: 10,
          orderBy: { restockDate: "desc" },
        },
        _count: {
          select: { sales: true, restocks: true },
        },
      },
    });

    if (!item) throw new Error("Inventory item not found");

    // Aggregate stats
    const [salesStats, totalRestocked] = await Promise.all([
      prisma.inventorySale.aggregate({
        where: { inventoryItemId: id, status: "COMPLETED" },
        _sum: {
          quantitySold: true,
          totalRevenue: true,
          totalCost: true,
          profit: true,
        },
        _count: true,
      }),
      prisma.inventoryRestock.aggregate({
        where: { inventoryItemId: id },
        _sum: { quantityAdded: true, totalCost: true },
      }),
    ]);

    return {
      ...item,
      margin: Number(item.sellingPrice) - Number(item.costPrice),
      marginPct:
        Number(item.costPrice) > 0
          ? (
              ((Number(item.sellingPrice) - Number(item.costPrice)) /
                Number(item.costPrice)) *
              100
            ).toFixed(1)
          : "0",
      isLowStock:
        item.lowStockThreshold !== null &&
        item.quantityInStock <= item.lowStockThreshold,
      totalStockValue: Number(item.costPrice) * item.quantityInStock,
      stats: {
        totalUnitsSold: salesStats._sum.quantitySold || 0,
        totalRevenue: salesStats._sum.totalRevenue || 0,
        totalCostOfSales: salesStats._sum.totalCost || 0,
        totalProfit: salesStats._sum.profit || 0,
        totalSalesCount: salesStats._count,
        totalUnitsRestocked: totalRestocked._sum.quantityAdded || 0,
        totalRestockCost: totalRestocked._sum.totalCost || 0,
      },
    };
  }

  async updateItem(
    id: string,
    companyId: string | null,
    data: {
      name?: string;
      description?: string;
      category?: string;
      sku?: string;
      unit?: string;
      imageUrl?: string;
      costPrice?: number;
      sellingPrice?: number;
      lowStockThreshold?: number;
      status?: string;
    },
    updatedBy: string,
  ) {
    const where: any = { id };
    if (companyId !== null) where.companyId = companyId;

    const item = await prisma.inventoryItem.findFirst({ where });
    if (!item) throw new Error("Inventory item not found");

    // Check SKU uniqueness if being changed
    if (data.sku && data.sku !== item.sku) {
      const existing = await prisma.inventoryItem.findFirst({
        where: {
          companyId: item.companyId,
          sku: data.sku,
          id: { not: id },
        },
      });
      if (existing)
        throw new Error(`An item with SKU "${data.sku}" already exists`);
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...data,
        updatedBy,
        ...(data.status && { status: data.status as any }),
      },
    });

    await AuditLogUtil.log({
      companyId: item.companyId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      entityType: "INVENTORY_ITEM",
      entityId: id,
      changes: data,
    });

    return updated;
  }

  async deleteItem(id: string, companyId: string | null, deletedBy: string) {
    const where: any = { id };
    if (companyId !== null) where.companyId = companyId;

    const item = await prisma.inventoryItem.findFirst({
      where,
      include: { _count: { select: { sales: true } } },
    });

    if (!item) throw new Error("Inventory item not found");

    if (item._count.sales > 0) {
      throw new Error(
        `Cannot delete item with ${item._count.sales} sale record(s). Consider marking it as DISCONTINUED instead.`,
      );
    }

    await prisma.inventoryItem.delete({ where: { id } });

    await AuditLogUtil.log({
      companyId: item.companyId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: "INVENTORY_ITEM",
      entityId: id,
    });

    return { message: "Item deleted successfully" };
  }

  // ════════════════════════════════════════════════════════════════
  // SALES
  // ════════════════════════════════════════════════════════════════

  async recordSale(
    companyId: string,
    agentId: string,
    data: {
      inventoryItemId: string;
      quantitySold: number;
      salePricePerUnit: number;
      buyerName?: string;
      buyerContact?: string;
      notes?: string;
      saleDate?: Date;
    },
  ) {
    console.log("🛒 Recording sale:", {
      companyId,
      itemId: data.inventoryItemId,
      qty: data.quantitySold,
    });

    const item = await prisma.inventoryItem.findFirst({
      where: { id: data.inventoryItemId, companyId },
    });

    if (!item) throw new Error("Inventory item not found");
    if (item.status === "DISCONTINUED")
      throw new Error("This item is discontinued and cannot be sold");
    if (item.quantityInStock < data.quantitySold) {
      throw new Error(
        `Insufficient stock. Available: ${item.quantityInStock} ${item.unit || "unit(s)"}, Requested: ${data.quantitySold}`,
      );
    }

    const costPriceAtSale = Number(item.costPrice);
    const totalCost = costPriceAtSale * data.quantitySold;
    const totalRevenue = data.salePricePerUnit * data.quantitySold;
    const profit = totalRevenue - totalCost;
    const newQty = item.quantityInStock - data.quantitySold;

    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.inventorySale.create({
        data: {
          companyId,
          inventoryItemId: data.inventoryItemId,
          agentId,
          quantitySold: data.quantitySold,
          costPriceAtSale,
          salePricePerUnit: data.salePricePerUnit,
          totalCost,
          totalRevenue,
          profit,
          buyerName: data.buyerName || null,
          buyerContact: data.buyerContact || null,
          notes: data.notes || null,
          saleDate: data.saleDate || new Date(),
          status: "COMPLETED",
        },
        include: {
          inventoryItem: {
            select: { id: true, name: true, sku: true, unit: true },
          },
          agent: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Decrement stock; auto-set OUT_OF_STOCK if reaches 0
      await tx.inventoryItem.update({
        where: { id: data.inventoryItemId },
        data: {
          quantityInStock: newQty,
          status: newQty === 0 ? "OUT_OF_STOCK" : item.status,
        },
      });

      return newSale;
    });

    await AuditLogUtil.log({
      companyId,
      userId: agentId,
      action: AuditAction.CREATE,
      entityType: "INVENTORY_SALE",
      entityId: sale.id,
      changes: { ...data, profit, totalRevenue, totalCost },
    });

    console.log("✅ Sale recorded:", sale.id, `| Profit: ${profit}`);
    return sale;
  }

  async getAllSales(
    companyId: string | null,
    query: IPaginationQuery & {
      inventoryItemId?: string;
      agentId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = {};
    if (companyId !== null) where.companyId = companyId;
    if (query.inventoryItemId) where.inventoryItemId = query.inventoryItemId;
    if (query.agentId) where.agentId = query.agentId;
    if (query.status) where.status = query.status;

    if (query.startDate || query.endDate) {
      where.saleDate = {};
      if (query.startDate) {
        const d = new Date(query.startDate);
        d.setHours(0, 0, 0, 0);
        where.saleDate.gte = d;
      }
      if (query.endDate) {
        const d = new Date(query.endDate);
        d.setHours(23, 59, 59, 999);
        where.saleDate.lte = d;
      }
    }

    const validSortFields = [
      "saleDate",
      "createdAt",
      "totalRevenue",
      "profit",
      "quantitySold",
    ];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "saleDate";

    const [sales, total] = await Promise.all([
      prisma.inventorySale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [safeSortBy]: sortOrder },
        include: {
          inventoryItem: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              category: true,
            },
          },
          agent: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.inventorySale.count({ where }),
    ]);

    return PaginationUtil.formatPaginationResult(sales, total, page, limit);
  }

  async getSalesStats(
    companyId: string | null,
    filters: { startDate?: string; endDate?: string; inventoryItemId?: string },
  ) {
    const where: any = { status: "COMPLETED" };
    if (companyId !== null) where.companyId = companyId;
    if (filters.inventoryItemId)
      where.inventoryItemId = filters.inventoryItemId;

    if (filters.startDate || filters.endDate) {
      where.saleDate = {};
      if (filters.startDate) {
        const d = new Date(filters.startDate);
        d.setHours(0, 0, 0, 0);
        where.saleDate.gte = d;
      }
      if (filters.endDate) {
        const d = new Date(filters.endDate);
        d.setHours(23, 59, 59, 999);
        where.saleDate.lte = d;
      }
    }

    const [agg, topItems] = await Promise.all([
      prisma.inventorySale.aggregate({
        where,
        _sum: {
          quantitySold: true,
          totalRevenue: true,
          totalCost: true,
          profit: true,
        },
        _count: true,
      }),
      prisma.inventorySale.groupBy({
        by: ["inventoryItemId"],
        where,
        _sum: { quantitySold: true, profit: true, totalRevenue: true },
        orderBy: { _sum: { profit: "desc" } },
        take: 5,
      }),
    ]);

    // Enrich top items with names
    const topItemIds = topItems.map((t) => t.inventoryItemId);
    const topItemDetails = await prisma.inventoryItem.findMany({
      where: { id: { in: topItemIds } },
      select: { id: true, name: true, sku: true },
    });

    const topItemsEnriched = topItems.map((t) => ({
      ...t,
      item: topItemDetails.find((d) => d.id === t.inventoryItemId),
    }));

    return {
      totalSales: agg._count,
      totalUnitsSold: agg._sum.quantitySold || 0,
      totalRevenue: agg._sum.totalRevenue || 0,
      totalCost: agg._sum.totalCost || 0,
      totalProfit: agg._sum.profit || 0,
      profitMargin:
        agg._sum.totalRevenue && Number(agg._sum.totalRevenue) > 0
          ? (
              (Number(agg._sum.profit) / Number(agg._sum.totalRevenue)) *
              100
            ).toFixed(1)
          : "0",
      topItems: topItemsEnriched,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // RESTOCKS
  // ════════════════════════════════════════════════════════════════

  async restockItem(
    itemId: string,
    companyId: string | null,
    data: {
      quantityAdded: number;
      costPerUnit: number;
      supplier?: string;
      notes?: string;
      restockDate?: Date;
    },
    restockedBy: string,
  ) {
    console.log("📥 Restocking item:", { itemId, qty: data.quantityAdded });

    const where: any = { id: itemId };
    if (companyId !== null) where.companyId = companyId;

    const item = await prisma.inventoryItem.findFirst({ where });
    if (!item) throw new Error("Inventory item not found");

    const totalCost = data.costPerUnit * data.quantityAdded;
    const newQty = item.quantityInStock + data.quantityAdded;

    const restock = await prisma.$transaction(async (tx) => {
      const newRestock = await tx.inventoryRestock.create({
        data: {
          companyId: item.companyId,
          inventoryItemId: itemId,
          quantityAdded: data.quantityAdded,
          costPerUnit: data.costPerUnit,
          totalCost,
          supplier: data.supplier || null,
          notes: data.notes || null,
          restockedBy,
          restockDate: data.restockDate || new Date(),
        },
      });

      // Update stock and cost price; re-activate if was OUT_OF_STOCK
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          quantityInStock: newQty,
          costPrice: data.costPerUnit, // update cost to latest restock price
          status: item.status === "OUT_OF_STOCK" ? "ACTIVE" : item.status,
          updatedBy: restockedBy,
        },
      });

      return newRestock;
    });

    await AuditLogUtil.log({
      companyId: item.companyId,
      userId: restockedBy,
      action: AuditAction.UPDATE,
      entityType: "INVENTORY_ITEM",
      entityId: itemId,
      changes: { restock: data, newQuantity: newQty },
    });

    console.log("✅ Restocked:", itemId, "| New qty:", newQty);
    return restock;
  }

  async getRestockHistory(
    itemId: string,
    companyId: string | null,
    query: IPaginationQuery,
  ) {
    const where: any = { id: itemId };
    if (companyId !== null) where.companyId = companyId;

    const item = await prisma.inventoryItem.findFirst({ where });
    if (!item) throw new Error("Inventory item not found");

    const { page, limit, skip } = PaginationUtil.getPaginationParams(query);

    const [restocks, total] = await Promise.all([
      prisma.inventoryRestock.findMany({
        where: { inventoryItemId: itemId },
        skip,
        take: limit,
        orderBy: { restockDate: "desc" },
      }),
      prisma.inventoryRestock.count({ where: { inventoryItemId: itemId } }),
    ]);

    return PaginationUtil.formatPaginationResult(restocks, total, page, limit);
  }

  // ════════════════════════════════════════════════════════════════
  // DASHBOARD OVERVIEW
  // ════════════════════════════════════════════════════════════════

  async getInventoryOverview(companyId: string | null) {
    const where: any = {};
    if (companyId !== null) where.companyId = companyId;

    const [
      totalItems,
      activeItems,
      outOfStockItems,
      lowStockItems,
      salesStats,
      stockValue,
    ] = await Promise.all([
      prisma.inventoryItem.count({ where }),
      prisma.inventoryItem.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.inventoryItem.count({
        where: { ...where, status: "OUT_OF_STOCK" },
      }),
      prisma.inventoryItem.findMany({
        where: { ...where, status: "ACTIVE" },
        select: { quantityInStock: true, lowStockThreshold: true },
      }),
      prisma.inventorySale.aggregate({
        where: { ...where, status: "COMPLETED" },
        _sum: { totalRevenue: true, profit: true, quantitySold: true },
        _count: true,
      }),
      prisma.inventoryItem.findMany({
        where,
        select: { costPrice: true, quantityInStock: true },
      }),
    ]);

    const lowStockCount = lowStockItems.filter(
      (i) =>
        i.lowStockThreshold !== null &&
        i.quantityInStock <= i.lowStockThreshold,
    ).length;

    const totalStockValue = stockValue.reduce(
      (sum, i) => sum + Number(i.costPrice) * i.quantityInStock,
      0,
    );

    return {
      totalItems,
      activeItems,
      outOfStockItems,
      lowStockCount,
      totalStockValue,
      totalSales: salesStats._count,
      totalRevenue: salesStats._sum.totalRevenue || 0,
      totalProfit: salesStats._sum.profit || 0,
      totalUnitsSold: salesStats._sum.quantitySold || 0,
    };
  }
}
