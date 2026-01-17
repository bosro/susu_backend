// src/modules/daily-summaries/daily-summaries.service.ts
import { prisma } from '../../config/database';
import { PaginationUtil } from '../../utils/pagination.util';
import { AuditLogUtil } from '../../utils/audit-log.util';
import { AuditAction, UserRole, CollectionStatus } from '../../types/enums';
import { IPaginationQuery } from '../../types/interfaces';

export class DailySummariesService {
  async generate(
    companyId: string,
    branchId: string,
    agentId: string,
    date: Date
  ) {
    const normalizedDate = new Date(date.setHours(0, 0, 0, 0));

    console.log('📊 Generating daily summary:', { companyId, branchId, agentId, date: normalizedDate });

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
      throw new Error('Daily summary already exists for this date');
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
      (sum, col) => sum + (col.expectedAmount?.toNumber() || col.amount.toNumber()),
      0
    );

    const totalCollected = collections
      .filter((col) => col.status === CollectionStatus.COLLECTED || col.status === CollectionStatus.PARTIAL)
      .reduce((sum, col) => sum + col.amount.toNumber(), 0);

    const collectionsCount = collections.filter(
      (col) => col.status === CollectionStatus.COLLECTED || col.status === CollectionStatus.PARTIAL
    ).length;

    const missedCount = collections.filter(
      (col) => col.status === CollectionStatus.MISSED
    ).length;

    const totalCustomers = new Set(collections.map((col) => col.customerId)).size;

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
      entityType: 'DAILY_SUMMARY',
      entityId: summary.id,
      changes: {
        date: normalizedDate,
        totalCollected,
        totalExpected,
      },
    });

    console.log('✅ Daily summary created successfully');

    return summary;
  }

  async getAll(
    companyId: string,
    query: IPaginationQuery,
    userRole: UserRole,
    userId?: string,
    userBranchId?: string
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = { companyId };

    console.log('Daily summaries query:', { companyId, userRole, userId, userBranchId, query });

    // ✅ CRITICAL: Role-based data scoping
    if (userRole === UserRole.AGENT) {
      // Agents can ONLY see their own summaries
      if (!userId) {
        throw new Error('Agent ID is required');
      }
      where.agentId = userId;
      
      if (userBranchId) {
        where.branchId = userBranchId;
      }
      
      console.log('✅ Agent scope applied - filtered to agentId:', userId);
    } else if (userRole === UserRole.COMPANY_ADMIN) {
      // Company admins see all summaries in their company
      // But can optionally filter
      if (query.branchId) {
        where.branchId = query.branchId;
      }
      if (query.agentId) {
        where.agentId = query.agentId;
      }
      
      console.log('✅ Company admin scope - can see all company summaries');
    }
    // SUPER_ADMIN sees everything (no additional filtering)

    if (query.isLocked !== undefined) {
      where.isLocked = query.isLocked;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    console.log('Final where clause:', JSON.stringify(where, null, 2));

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
    companyId: string,
    userRole: UserRole,
    userId?: string
  ) {
    const where: any = { id, companyId };

    // ✅ Agents can only see their own summaries
    if (userRole === UserRole.AGENT) {
      if (!userId) {
        throw new Error('Agent ID is required');
      }
      where.agentId = userId;
      console.log('✅ Agent accessing summary - filtered to agentId:', userId);
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
      throw new Error('Daily summary not found or you do not have access');
    }

    return summary;
  }

  async update(
    id: string,
    companyId: string,
    data: {
      notes?: string;
      isLocked?: boolean;
    },
    updatedBy: string
  ) {
    const summary = await prisma.dailySummary.findFirst({
      where: { id, companyId },
    });

    if (!summary) {
      throw new Error('Daily summary not found');
    }

    if (summary.isLocked && data.isLocked !== false) {
      throw new Error('Cannot update locked summary. Please unlock it first.');
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
      companyId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      entityType: 'DAILY_SUMMARY',
      entityId: id,
      changes: data,
    });

    console.log('✅ Daily summary updated successfully');

    return updated;
  }

  async lock(id: string, companyId: string, lockedBy: string) {
    const summary = await prisma.dailySummary.findFirst({
      where: { id, companyId },
    });

    if (!summary) {
      throw new Error('Daily summary not found');
    }

    if (summary.isLocked) {
      throw new Error('Summary is already locked');
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
      companyId,
      userId: lockedBy,
      action: AuditAction.UPDATE,
      entityType: 'DAILY_SUMMARY',
      entityId: id,
      changes: { isLocked: true },
    });

    console.log('✅ Daily summary locked successfully');

    return updated;
  }

  async unlock(id: string, companyId: string, unlockedBy: string) {
    const summary = await prisma.dailySummary.findFirst({
      where: { id, companyId },
    });

    if (!summary) {
      throw new Error('Daily summary not found');
    }

    if (!summary.isLocked) {
      throw new Error('Summary is not locked');
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
      companyId,
      userId: unlockedBy,
      action: AuditAction.UPDATE,
      entityType: 'DAILY_SUMMARY',
      entityId: id,
      changes: { isLocked: false },
    });

    console.log('✅ Daily summary unlocked successfully');

    return updated;
  }

  async getStats(
    companyId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      branchId?: string;
      agentId?: string;
    }
  ) {
    const where: any = { companyId };

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
      totalSummaries: summaries._count,
      totalExpected: summaries._sum.totalExpected || 0,
      totalCollected: summaries._sum.totalCollected || 0,
      totalCustomers: summaries._sum.totalCustomers || 0,
      totalCollections: summaries._sum.collectionsCount || 0,
      totalMissed: summaries._sum.missedCount || 0,
      averageExpected: summaries._avg.totalExpected || 0,
      averageCollected: summaries._avg.totalCollected || 0,
      collectionRate:
        summaries._sum.totalExpected && Number(summaries._sum.totalExpected) > 0
          ? ((Number(summaries._sum.totalCollected) / Number(summaries._sum.totalExpected)) * 100).toFixed(2)
          : '0',
    };
  }
}