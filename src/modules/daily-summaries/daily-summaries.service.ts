// src/modules/daily-summaries/daily-summaries.service.ts
import { prisma } from "../../config/database";
import { PaginationUtil } from "../../utils/pagination.util";
import { AuditLogUtil } from "../../utils/audit-log.util";
import { AuditAction, UserRole, CollectionStatus } from "../../types/enums";
import { IPaginationQuery } from "../../types/interfaces";

export class DailySummariesService {
  async generate(
    companyId: string,
    branchId: string,
    agentId: string,
    date: Date
  ) {
    // ✅ Validate required fields
    if (!companyId) {
      throw new Error("Company ID is required to generate daily summary");
    }

    if (!branchId) {
      throw new Error("Branch ID is required to generate daily summary");
    }

    const normalizedDate = new Date(date.setHours(0, 0, 0, 0));

    console.log("📊 Generating daily summary:", {
      companyId,
      branchId,
      agentId,
      date: normalizedDate,
    });

    console.log("📊 Generating daily summary:", {
      companyId,
      branchId,
      agentId,
      date: normalizedDate,
    });

    // Check if summary already exists
    const existingSummary = await prisma.dailySummary.findFirst({
      where: {
        companyId,
        branchId,
        agentId,
        date: normalizedDate,
      },
    });

    if (existingSummary) {
      throw new Error("Daily summary already exists for this date");
    }

    // Get collections for the day
    const startOfDay = new Date(normalizedDate);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const collections = await prisma.collection.findMany({
      where: {
        companyId,
        branchId,
        agentId,
        collectionDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    console.log(`✅ Found ${collections.length} collections for the day`);

    const totalExpected = collections.reduce(
      (sum, col) =>
        sum + (col.expectedAmount?.toNumber() || col.amount.toNumber()),
      0
    );

    const totalCollected = collections
      .filter(
        (col) =>
          col.status === CollectionStatus.COLLECTED ||
          col.status === CollectionStatus.PARTIAL
      )
      .reduce((sum, col) => sum + col.amount.toNumber(), 0);

    const collectionsCount = collections.filter(
      (col) =>
        col.status === CollectionStatus.COLLECTED ||
        col.status === CollectionStatus.PARTIAL
    ).length;

    const missedCount = collections.filter(
      (col) => col.status === CollectionStatus.MISSED
    ).length;

    const totalCustomers = new Set(collections.map((col) => col.customerId))
      .size;

    const summary = await prisma.dailySummary.create({
      data: {
        companyId,
        branchId,
        agentId,
        date: normalizedDate,
        totalExpected,
        totalCollected,
        totalCustomers,
        collectionsCount,
        missedCount,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await AuditLogUtil.log({
      companyId,
      userId: agentId,
      action: AuditAction.CREATE,
      entityType: "DAILY_SUMMARY",
      entityId: summary.id,
      changes: {
        date: normalizedDate,
        totalCollected,
        totalExpected,
      },
    });

    console.log("✅ Daily summary created successfully");

    return summary;
  }

  async getAll(
    companyId: string | null,
    query: IPaginationQuery,
    userRole: UserRole,
    userId?: string,
    userBranchId?: string
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = {};

    console.log("Daily summaries query:", {
      companyId,
      userRole,
      userId,
      userBranchId,
      query,
    });

    // ✅ FIX: Only set companyId if not SUPER_ADMIN
    if (companyId !== null) {
      where.companyId = companyId;
    }

    // Role-based filtering
    if (userRole === UserRole.AGENT) {
      if (!userId) {
        throw new Error("Agent ID is required");
      }
      where.agentId = userId;

      if (userBranchId) {
        where.branchId = userBranchId;
      }

      console.log("✅ Agent scope applied - filtered to agentId:", userId);
    } else if (userRole === UserRole.COMPANY_ADMIN) {
      if (query.branchId) {
        where.branchId = query.branchId;
      }
      if (query.agentId) {
        where.agentId = query.agentId;
      }
    }

    // Date filtering
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    console.log("Final where clause:", JSON.stringify(where, null, 2));

    const [summaries, total] = await Promise.all([
      prisma.dailySummary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.dailySummary.count({ where }),
    ]);

    console.log(`✅ Found ${summaries.length} summaries out of ${total} total`);

    return PaginationUtil.formatPaginationResult(summaries, total, page, limit);
  }

  async getById(
    id: string,
    companyId: string | null, // ✅ Allow null for SUPER_ADMIN
    userRole: UserRole,
    userId?: string
  ) {
    const where: any = { id };

    // ✅ Only add companyId filter if not SUPER_ADMIN
    if (companyId !== null) {
      where.companyId = companyId;
    }

    // ✅ Agents can only see their own summaries
    if (userRole === UserRole.AGENT) {
      if (!userId) {
        throw new Error("Agent ID is required");
      }
      where.agentId = userId;
      console.log("✅ Agent accessing summary - filtered to agentId:", userId);
    }

    const summary = await prisma.dailySummary.findFirst({
      where,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!summary) {
      throw new Error("Daily summary not found or you do not have access");
    }

    return summary;
  }

  async update(
    id: string,
    companyId: string | null, // ✅ Allow null for SUPER_ADMIN
    data: {
      notes?: string;
      isLocked?: boolean;
    },
    updatedBy: string
  ) {
    const where: any = { id };

    // ✅ Only add companyId filter if provided
    if (companyId !== null) {
      where.companyId = companyId;
    }

    const summary = await prisma.dailySummary.findFirst({
      where,
    });

    if (!summary) {
      throw new Error("Daily summary not found");
    }

    if (summary.isLocked && data.isLocked !== false) {
      throw new Error("Cannot update locked summary. Please unlock it first.");
    }

    const updated = await prisma.dailySummary.update({
      where: { id },
      data,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await AuditLogUtil.log({
      companyId: summary.companyId, // ✅ Use summary's companyId for audit log
      userId: updatedBy,
      action: AuditAction.UPDATE,
      entityType: "DAILY_SUMMARY",
      entityId: id,
      changes: data,
    });

    console.log("✅ Daily summary updated successfully");

    return updated;
  }
  async lock(id: string, companyId: string | null, lockedBy: string) {
    const where: any = { id };

    if (companyId !== null) {
      where.companyId = companyId;
    }

    const summary = await prisma.dailySummary.findFirst({
      where,
    });

    if (!summary) {
      throw new Error("Daily summary not found");
    }

    if (summary.isLocked) {
      throw new Error("Summary is already locked");
    }

    const updated = await prisma.dailySummary.update({
      where: { id },
      data: { isLocked: true },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await AuditLogUtil.log({
      companyId: summary.companyId, // ✅ Use summary's companyId
      userId: lockedBy,
      action: AuditAction.UPDATE,
      entityType: "DAILY_SUMMARY",
      entityId: id,
      changes: { isLocked: true },
    });

    console.log("✅ Daily summary locked successfully");

    return updated;
  }

  async unlock(id: string, companyId: string | null, unlockedBy: string) {
    const where: any = { id };

    if (companyId !== null) {
      where.companyId = companyId;
    }

    const summary = await prisma.dailySummary.findFirst({
      where,
    });

    if (!summary) {
      throw new Error("Daily summary not found");
    }

    if (!summary.isLocked) {
      throw new Error("Summary is not locked");
    }

    const updated = await prisma.dailySummary.update({
      where: { id },
      data: { isLocked: false },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await AuditLogUtil.log({
      companyId: summary.companyId, // ✅ Use summary's companyId
      userId: unlockedBy,
      action: AuditAction.UPDATE,
      entityType: "DAILY_SUMMARY",
      entityId: id,
      changes: { isLocked: false },
    });

    console.log("✅ Daily summary unlocked successfully");

    return updated;
  }

  async getStats(
    companyId: string | null,
    filters: {
      startDate?: Date;
      endDate?: Date;
      branchId?: string;
      agentId?: string;
    }
  ) {
    const where: any = {};

    // ✅ FIX: Only set companyId if not SUPER_ADMIN
    if (companyId !== null) {
      where.companyId = companyId;
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters.agentId) {
      where.agentId = filters.agentId;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    const summaries = await prisma.dailySummary.aggregate({
      where,
      _sum: {
        totalExpected: true,
        totalCollected: true,
        totalCustomers: true,
        collectionsCount: true,
        missedCount: true,
      },
      _avg: {
        totalExpected: true,
        totalCollected: true,
      },
      _count: true,
    });

    return {
      totalExpected: summaries._sum.totalExpected || 0,
      totalCollected: summaries._sum.totalCollected || 0,
      totalCustomers: summaries._sum.totalCustomers || 0,
      collectionsCount: summaries._sum.collectionsCount || 0,
      missedCount: summaries._sum.missedCount || 0,
      avgExpected: summaries._avg.totalExpected || 0,
      avgCollected: summaries._avg.totalCollected || 0,
      totalSummaries: summaries._count,
      collectionRate:
        summaries._sum.collectionsCount && summaries._sum.totalCustomers
          ? (
              (summaries._sum.collectionsCount /
                summaries._sum.totalCustomers) *
              100
            ).toFixed(2)
          : "0",
    };
  }
}
