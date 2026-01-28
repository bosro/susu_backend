// src/modules/collections/collections.service.ts
// ✅ UPDATED - Added unread count tracking and mark as read functionality

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
  // ✅ NEW: Get unread collection count for a user
  async getUnreadCount(userId: string, companyId: string | null, userRole: UserRole): Promise<number> {
    const where: any = {};

    // Company filter
    if (companyId !== null) {
      where.companyId = companyId;
    }

    // Role-based filtering
    if (userRole === UserRole.AGENT) {
      // Agents only see collections they created
      where.agentId = userId;
    } else if (userRole === UserRole.COMPANY_ADMIN) {
      // Company admins see all company collections
      // No additional filter needed
    }

    // ✅ Collections not viewed by this user
    where.NOT = {
      viewedBy: {
        has: userId
      }
    };

    const count = await prisma.collection.count({ where });

    console.log(`📬 Unread collections for user ${userId}:`, count);

    return count;
  }

  // ✅ NEW: Mark collection as read by user
  async markAsRead(collectionId: string, userId: string): Promise<void> {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { viewedBy: true }
    });

    if (!collection) {
      throw new Error("Collection not found");
    }

    // Add user to viewedBy array if not already there
    if (!collection.viewedBy.includes(userId)) {
      await prisma.collection.update({
        where: { id: collectionId },
        data: {
          viewedBy: {
            push: userId
          }
        }
      });

      console.log(`✅ Collection ${collectionId} marked as read by user ${userId}`);
    }
  }

  // ✅ NEW: Mark multiple collections as read
  async markMultipleAsRead(collectionIds: string[], userId: string): Promise<void> {
    await prisma.collection.updateMany({
      where: {
        id: { in: collectionIds },
        NOT: {
          viewedBy: {
            has: userId
          }
        }
      },
      data: {
        viewedBy: {
          push: userId
        }
      }
    });

    console.log(`✅ Marked ${collectionIds.length} collections as read for user ${userId}`);
  }

  // ✅ EXISTING: Validate agent branch access
  async validateAgentBranchAccess(agentId: string, branchId: string): Promise<void> {
    const assignment = await prisma.agentBranchAssignment.findFirst({
      where: {
        userId: agentId,
        branchId: branchId,
      },
      include: {
        branch: {
          select: {
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new Error(
        'You do not have access to this branch. Please select a branch assigned to you.'
      );
    }

    if (!assignment.branch.isActive) {
      throw new Error(
        `Branch "${assignment.branch.name}" is currently inactive and cannot accept collections.`
      );
    }
  }

  // ✅ EXISTING: Get agent branches
  async getAgentBranches(agentId: string) {
    const assignments = await prisma.agentBranchAssignment.findMany({
      where: {
        userId: agentId,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        branch: {
          name: 'asc',
        },
      },
    });

    return assignments
      .filter(a => a.branch.isActive)
      .map(a => a.branch);
  }

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
      branchId,
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
      // Create collection with creator marked as viewed
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
          viewedBy: [agentId], // ✅ Creator has already "seen" their own collection
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
    query: IPaginationQuery & {
      customerId?: string;
      susuAccountId?: string;
      branchId?: string;
      agentId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
    userRole: UserRole,
    userId?: string
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = {};

    console.log("📋 Collections query:", {
      companyId,
      userRole,
      userId,
      queryParams: query,
    });

    // Company filter
    if (companyId !== null) {
      where.companyId = companyId;
    }

    // Role-based data scoping
    if (userRole === UserRole.AGENT) {
      if (!userId) {
        console.warn("❌ Agent has no user ID");
        throw new Error("Agent ID is required");
      }

      const agentBranches = await this.getAgentBranches(userId);
      const branchIds = agentBranches.map(b => b.id);

      if (branchIds.length === 0) {
        console.warn("⚠️ Agent has no assigned branches");
        return PaginationUtil.formatPaginationResult([], 0, page, limit);
      }

      where.agentId = userId;
      where.branchId = { in: branchIds };

      console.log(`✅ Agent scope applied - filtered to branches: ${branchIds.join(', ')}`);
    } else if (userRole === UserRole.COMPANY_ADMIN) {
      if (query.branchId) {
        where.branchId = query.branchId;
      }
      if (query.agentId) {
        where.agentId = query.agentId;
      }

      console.log("✅ Company admin scope - can see all company data");
    }

    // Additional filters
    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.susuAccountId) {
      where.susuAccountId = query.susuAccountId;
    }

    if (query.status) {
      where.status = query.status;
    }

    // Date handling
    if (query.startDate || query.endDate) {
      where.collectionDate = {};
      
      if (query.startDate) {
        try {
          const startDate = new Date(query.startDate);
          startDate.setHours(0, 0, 0, 0);
          where.collectionDate.gte = startDate;
          console.log("📅 Start date filter:", startDate);
        } catch (error) {
          console.error("❌ Invalid start date:", query.startDate);
        }
      }
      
      if (query.endDate) {
        try {
          const endDate = new Date(query.endDate);
          endDate.setHours(23, 59, 59, 999);
          where.collectionDate.lte = endDate;
          console.log("📅 End date filter:", endDate);
        } catch (error) {
          console.error("❌ Invalid end date:", query.endDate);
        }
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

    console.log("🔍 Final where clause:", JSON.stringify(where, null, 2));

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
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.collection.count({ where }),
    ]);

    // ✅ Add isRead flag to each collection
    const collectionsWithReadStatus = collections.map(collection => ({
      ...collection,
      isRead: userId ? collection.viewedBy.includes(userId) : true
    }));

    console.log(
      `✅ Found ${collections.length} collections out of ${total} total`
    );

    return PaginationUtil.formatPaginationResult(
      collectionsWithReadStatus,
      total,
      page,
      limit
    );
  }

  async getById(
    id: string,
    companyId: string | null,
    userRole: UserRole,
    userId?: string
  ) {
    const where: any = { id };

    if (companyId !== null) {
      where.companyId = companyId;
    }

    if (userRole === UserRole.AGENT) {
      if (!userId) {
        throw new Error("Agent ID is required");
      }

      const agentBranches = await this.getAgentBranches(userId);
      const branchIds = agentBranches.map(b => b.id);

      where.agentId = userId;
      where.branchId = { in: branchIds };
      
      console.log(
        "✅ Agent accessing collection - filtered to assigned branches"
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
            company: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!collection) {
      throw new Error("Collection not found or you do not have access");
    }

    // ✅ Mark as read when user views the collection
    if (userId) {
      await this.markAsRead(id, userId);
    }

    return {
      ...collection,
      isRead: userId ? collection.viewedBy.includes(userId) : true
    };
  }

  async update(
    id: string,
    companyId: string | null,
    data: {
      amount?: number;
      status?: CollectionStatus;
      notes?: string;
    },
    updatedBy: string,
    userRole: UserRole
  ) {
    if (
      userRole !== UserRole.COMPANY_ADMIN &&
      userRole !== UserRole.SUPER_ADMIN
    ) {
      throw new Error("Only company admin can update collections");
    }

    const where: any = { id };
    if (companyId !== null) {
      where.companyId = companyId;
    }

    const collection = await prisma.collection.findFirst({
      where,
      include: {
        susuAccount: true,
      },
    });

    if (!collection) {
      throw new Error("Collection not found");
    }

    console.log("📝 Updating collection:", { id, changes: data });

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
      companyId: collection.companyId,
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
    companyId: string | null,
    deletedBy: string,
    userRole: UserRole
  ) {
    if (
      userRole !== UserRole.COMPANY_ADMIN &&
      userRole !== UserRole.SUPER_ADMIN
    ) {
      throw new Error("Only company admin can delete collections");
    }

    const where: any = { id };
    if (companyId !== null) {
      where.companyId = companyId;
    }

    const collection = await prisma.collection.findFirst({
      where,
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
      companyId: collection.companyId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: "COLLECTION",
      entityId: id,
    });

    console.log("✅ Collection deleted successfully");

    return { message: "Collection deleted successfully" };
  }

  async getStats(
    companyId: string | null,
    filters: {
      startDate?: string;
      endDate?: string;
      branchId?: string;
      agentId?: string;
    }
  ) {
    const where: any = {};

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
      where.collectionDate = {};
      
      if (filters.startDate) {
        try {
          const startDate = new Date(filters.startDate);
          startDate.setHours(0, 0, 0, 0);
          where.collectionDate.gte = startDate;
        } catch (error) {
          console.error("❌ Invalid start date in stats:", filters.startDate);
        }
      }
      
      if (filters.endDate) {
        try {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          where.collectionDate.lte = endDate;
        } catch (error) {
          console.error("❌ Invalid end date in stats:", filters.endDate);
        }
      }
    }

    console.log("📊 Stats where clause:", JSON.stringify(where, null, 2));

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