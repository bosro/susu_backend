// src/modules/collections/collections.service.ts
import { prisma } from "../../config/database";
import { PaginationUtil } from "../../utils/pagination.util";
import { AuditLogUtil } from "../../utils/audit-log.util";
import { AccountNumberUtil } from "../../utils/account-number.util";
import {
  AuditAction,
  UserRole,
  CollectionStatus,
  TransactionType,
} from "../../types/enums";
import { IPaginationQuery } from "../../types/interfaces";

export class CollectionsService {
  async create(
    companyId: string,
    branchId: string,
    agentId: string,
    data: {
      customerId: string;
      susuAccountId: string;
      amount: number;
      expectedAmount?: number;
      collectionDate?: Date;
      status?: CollectionStatus;
      notes?: string;
      latitude?: string;
      longitude?: string;
    }
  ) {
    console.log("💰 Creating collection:", {
      companyId,
      customerId: data.customerId,
      amount: data.amount,
      status: data.status || CollectionStatus.COLLECTED,
    });

    // Validate customer
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    if (!customer.isActive) {
      throw new Error("Customer is not active");
    }

    // Validate susu account
    const susuAccount = await prisma.susuAccount.findFirst({
      where: {
        id: data.susuAccountId,
        customerId: data.customerId,
      },
      include: {
        susuPlan: true,
      },
    });

    if (!susuAccount) {
      throw new Error("Susu account not found");
    }

    if (!susuAccount.isActive) {
      throw new Error("Susu account is not active");
    }

    // Validate amount
    if (data.amount < 0) {
      throw new Error("Collection amount cannot be negative");
    }

    if (data.status === CollectionStatus.MISSED && data.amount > 0) {
      throw new Error("Missed collections cannot have an amount");
    }

    const collection = await prisma.$transaction(async (tx) => {
      // Create collection
      const newCollection = await tx.collection.create({
        data: {
          companyId,
          branchId,
          customerId: data.customerId,
          susuAccountId: data.susuAccountId,
          agentId,
          amount: data.amount,
          expectedAmount: data.expectedAmount || susuAccount.susuPlan.amount,
          collectionDate: data.collectionDate || new Date(),
          status: data.status || CollectionStatus.COLLECTED,
          notes: data.notes,
          latitude: data.latitude,
          longitude: data.longitude,
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          susuAccount: {
            select: {
              id: true,
              accountNumber: true,
              balance: true,
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

      // Update account balance if collection is successful (not missed)
      if (data.status !== CollectionStatus.MISSED && data.amount > 0) {
        const currentBalance = Number(susuAccount.balance);
        const newBalance = currentBalance + data.amount;

        await tx.susuAccount.update({
          where: { id: data.susuAccountId },
          data: { balance: newBalance },
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            susuAccountId: data.susuAccountId,
            type: TransactionType.DEPOSIT,
            amount: data.amount,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            reference: AccountNumberUtil.generateReference("COL"),
            description: `Collection from ${customer.firstName} ${customer.lastName}`,
          },
        });

        console.log(
          `✅ Account balance updated: ${currentBalance} → ${newBalance}`
        );
      }

      return newCollection;
    });

    await AuditLogUtil.log({
      companyId,
      userId: agentId,
      action: AuditAction.CREATE,
      entityType: "COLLECTION",
      entityId: collection.id,
      changes: data,
    });

    console.log("✅ Collection created successfully:", collection.id);

    return collection;
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

    console.log("Collections query:", {
      companyId,
      userRole,
      userId,
      userBranchId,
      queryParams: query,
    });

    // ✅ FIX: Only set companyId if not SUPER_ADMIN
    if (companyId !== null) {
      where.companyId = companyId;
    }

    // ✅ CRITICAL: Role-based data scoping
    if (userRole === UserRole.AGENT) {
      // Agents can ONLY see their own collections
      if (!userId) {
        console.warn("❌ Agent has no user ID");
        throw new Error("Agent ID is required");
      }

      where.agentId = userId;

      // Also restrict to their branch if assigned
      if (userBranchId) {
        where.branchId = userBranchId;
      }

      console.log("✅ Agent scope applied - filtered to agentId:", userId);
    } else if (userRole === UserRole.COMPANY_ADMIN) {
      // Company admins see all collections in their company
      // But can optionally filter
      if (query.branchId) {
        where.branchId = query.branchId;
      }
      if (query.agentId) {
        where.agentId = query.agentId;
      }

      console.log("✅ Company admin scope - can see all company data");
    }
    // SUPER_ADMIN sees everything with no additional restrictions

    // Additional filters (applied to all roles within their scope)
    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.susuAccountId) {
      where.susuAccountId = query.susuAccountId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.collectionDate = {};
      if (query.startDate) {
        where.collectionDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.collectionDate.lte = new Date(query.endDate);
      }
    }

    if (query.search) {
      where.customer = {
        OR: [
          { firstName: { contains: query.search, mode: "insensitive" } },
          { lastName: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search, mode: "insensitive" } },
        ],
      };
    }

    console.log("Final where clause:", JSON.stringify(where, null, 2));

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          susuAccount: {
            select: {
              id: true,
              accountNumber: true,
              balance: true,
              susuPlan: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.collection.count({ where }),
    ]);

    console.log(
      `✅ Found ${collections.length} collections out of ${total} total`
    );

    return PaginationUtil.formatPaginationResult(
      collections,
      total,
      page,
      limit
    );
  }

  async getById(
    id: string,
    companyId: string,
    userRole: UserRole,
    userId?: string
  ) {
    const where: any = { id, companyId };

    // ✅ Agents can only see their own collections
    if (userRole === UserRole.AGENT) {
      if (!userId) {
        throw new Error("Agent ID is required");
      }
      where.agentId = userId;
      console.log(
        "✅ Agent accessing collection - filtered to agentId:",
        userId
      );
    }

    const collection = await prisma.collection.findFirst({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            address: true,
            idNumber: true,
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        susuAccount: {
          select: {
            id: true,
            accountNumber: true,
            balance: true,
            susuPlan: {
              select: {
                id: true,
                name: true,
                type: true,
                amount: true,
              },
            },
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
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    if (!collection) {
      throw new Error("Collection not found or you do not have access");
    }

    return collection;
  }

  async update(
    id: string,
    companyId: string,
    data: {
      amount?: number;
      status?: CollectionStatus;
      notes?: string;
    },
    updatedBy: string,
    userRole: UserRole
  ) {
    // Only company admin and super admin can update collections
    if (
      userRole !== UserRole.COMPANY_ADMIN &&
      userRole !== UserRole.SUPER_ADMIN
    ) {
      throw new Error("Only company admin can update collections");
    }

    const collection = await prisma.collection.findFirst({
      where: { id, companyId },
      include: {
        susuAccount: true,
      },
    });

    if (!collection) {
      throw new Error("Collection not found");
    }

    console.log("📝 Updating collection:", { id, changes: data });

    // If amount is changed, recalculate balance
    if (
      data.amount !== undefined &&
      data.amount !== Number(collection.amount)
    ) {
      const oldAmount = Number(collection.amount);
      const newAmount = data.amount;
      const difference = newAmount - oldAmount;
      const currentBalance = Number(collection.susuAccount.balance);
      const newBalance = currentBalance + difference;

      console.log("💰 Amount changed, updating balance:", {
        oldAmount,
        newAmount,
        difference,
        currentBalance,
        newBalance,
      });

      await prisma.$transaction([
        prisma.collection.update({
          where: { id },
          data,
        }),
        prisma.susuAccount.update({
          where: { id: collection.susuAccountId },
          data: { balance: newBalance },
        }),
      ]);
    } else {
      await prisma.collection.update({
        where: { id },
        data,
      });
    }

    await AuditLogUtil.log({
      companyId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      entityType: "COLLECTION",
      entityId: id,
      changes: data,
    });

    console.log("✅ Collection updated successfully");

    return this.getById(id, companyId, userRole, updatedBy);
  }

  async delete(
    id: string,
    companyId: string,
    deletedBy: string,
    userRole: UserRole
  ) {
    // Only company admin and super admin can delete collections
    if (
      userRole !== UserRole.COMPANY_ADMIN &&
      userRole !== UserRole.SUPER_ADMIN
    ) {
      throw new Error("Only company admin can delete collections");
    }

    const collection = await prisma.collection.findFirst({
      where: { id, companyId },
      include: {
        susuAccount: true,
      },
    });

    if (!collection) {
      throw new Error("Collection not found");
    }

    console.log("🗑️ Deleting collection:", {
      id,
      amount: collection.amount,
      status: collection.status,
    });

    // Reverse the balance change if collection was successful
    if (collection.status !== CollectionStatus.MISSED) {
      const currentBalance = Number(collection.susuAccount.balance);
      const newBalance = currentBalance - Number(collection.amount);

      console.log("💰 Reversing balance:", {
        currentBalance,
        collectionAmount: collection.amount,
        newBalance,
      });

      await prisma.$transaction([
        prisma.collection.delete({ where: { id } }),
        prisma.susuAccount.update({
          where: { id: collection.susuAccountId },
          data: { balance: newBalance },
        }),
      ]);
    } else {
      await prisma.collection.delete({ where: { id } });
    }

    await AuditLogUtil.log({
      companyId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: "COLLECTION",
      entityId: id,
    });

    console.log("✅ Collection deleted successfully");

    return { message: "Collection deleted successfully" };
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
      where.collectionDate = {};
      if (filters.startDate) {
        where.collectionDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.collectionDate.lte = filters.endDate;
      }
    }

    const [total, collected, missed, partial] = await Promise.all([
      prisma.collection.aggregate({
        where,
        _sum: { amount: true, expectedAmount: true },
        _count: true,
      }),
      prisma.collection.aggregate({
        where: { ...where, status: CollectionStatus.COLLECTED },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.collection.count({
        where: { ...where, status: CollectionStatus.MISSED },
      }),
      prisma.collection.aggregate({
        where: { ...where, status: CollectionStatus.PARTIAL },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      total: {
        amount: total._sum.amount || 0,
        expectedAmount: total._sum.expectedAmount || 0,
        count: total._count,
      },
      collected: {
        amount: collected._sum.amount || 0,
        count: collected._count,
      },
      missed: {
        count: missed,
      },
      partial: {
        amount: partial._sum.amount || 0,
        count: partial._count,
      },
      collectionRate:
        total._count > 0
          ? ((collected._count / total._count) * 100).toFixed(2)
          : "0",
    };
  }
}
