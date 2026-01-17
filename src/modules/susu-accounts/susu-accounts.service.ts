// src/modules/susu-accounts/susu-accounts.service.ts
import { prisma } from "../../config/database";
import { PaginationUtil } from "../../utils/pagination.util";
import { AuditLogUtil } from "../../utils/audit-log.util";
import { AccountNumberUtil } from "../../utils/account-number.util";
import { AuditAction, UserRole, TransactionType } from "../../types/enums";
import { IPaginationQuery } from "../../types/interfaces";

export class SusuAccountsService {
  async create(
    companyId: string,
    data: {
      customerId: string;
      susuPlanId: string;
      targetAmount?: number;
      startDate?: Date;
      endDate?: Date;
    },
    createdBy: string
  ) {
    console.log("💳 Creating susu account:", {
      companyId,
      customerId: data.customerId,
    });

    // Validate customer belongs to company
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Validate susu plan belongs to company
    const susuPlan = await prisma.susuPlan.findFirst({
      where: { id: data.susuPlanId, companyId, isActive: true },
    });

    if (!susuPlan) {
      throw new Error("Susu plan not found or is inactive");
    }

    // Generate unique account number
    const accountNumber = AccountNumberUtil.generate("SUS");

    const susuAccount = await prisma.susuAccount.create({
      data: {
        customerId: data.customerId,
        susuPlanId: data.susuPlanId,
        accountNumber,
        balance: 0,
        targetAmount: data.targetAmount || susuPlan.targetAmount || null,
        startDate: data.startDate || new Date(),
        endDate: data.endDate || null,
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
        susuPlan: {
          select: {
            id: true,
            name: true,
            type: true,
            amount: true,
          },
        },
      },
    });

    await AuditLogUtil.log({
      companyId,
      userId: createdBy,
      action: AuditAction.CREATE,
      entityType: "SUSU_ACCOUNT",
      entityId: susuAccount.id,
      changes: data,
    });

    console.log("✅ Susu account created:", susuAccount.accountNumber);

    return susuAccount;
  }

  async getAll(
    companyId: string | null,
    query: IPaginationQuery,
    userRole: UserRole,
    userBranchId?: string
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = {};

    console.log("Susu accounts query:", {
      companyId,
      userRole,
      userBranchId,
      query,
    });

    // ✅ FIX: Handle companyId properly for SUPER_ADMIN
    if (companyId !== null) {
      // Company admin and agents - filter by company
      where.customer = {
        companyId: companyId,
      };
    } else {
      // SUPER_ADMIN - no company filter, but initialize customer object if needed for other filters
      where.customer = {};
    }

    // Role-based filtering
    if (userRole === UserRole.AGENT && userBranchId) {
      where.customer.branchId = userBranchId;
      console.log(
        "✅ Agent scope applied - filtered to branchId:",
        userBranchId
      );
    }

    // Additional filters
    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.susuPlanId) {
      where.susuPlanId = query.susuPlanId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.customer = {
        ...where.customer,
        OR: [
          { firstName: { contains: query.search, mode: "insensitive" } },
          { lastName: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search, mode: "insensitive" } },
        ],
      };
    }

    // ✅ Clean up empty customer object if SUPER_ADMIN with no filters
    if (Object.keys(where.customer || {}).length === 0) {
      delete where.customer;
    }

    console.log("Final where clause:", JSON.stringify(where, null, 2));

    const [accounts, total] = await Promise.all([
      prisma.susuAccount.findMany({
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
          susuPlan: {
            select: {
              id: true,
              name: true,
              type: true,
              amount: true,
            },
          },
          _count: {
            select: {
              collections: true,
              transactions: true,
            },
          },
        },
      }),
      prisma.susuAccount.count({ where }),
    ]);

    console.log(`✅ Found ${accounts.length} accounts out of ${total} total`);

    return PaginationUtil.formatPaginationResult(accounts, total, page, limit);
  }

  async getById(
    id: string,
    companyId: string,
    userRole: UserRole,
    userBranchId?: string
  ) {
    const where: any = {
      id,
      customer: { companyId },
    };

    // ✅ Agents can only see accounts in their branch
    if (userRole === UserRole.AGENT) {
      if (!userBranchId) {
        throw new Error("Agent must be assigned to a branch");
      }
      where.customer.branchId = userBranchId;
      console.log(
        "✅ Agent accessing account - filtered to branchId:",
        userBranchId
      );
    }

    const account = await prisma.susuAccount.findFirst({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        susuPlan: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            amount: true,
            frequency: true,
            duration: true,
          },
        },
        _count: {
          select: {
            collections: true,
            transactions: true,
          },
        },
      },
    });

    if (!account) {
      throw new Error("Susu account not found or you do not have access");
    }

    return account;
  }

  async update(
    id: string,
    companyId: string,
    data: {
      targetAmount?: number;
      endDate?: Date;
      isActive?: boolean;
    },
    updatedBy: string
  ) {
    const account = await prisma.susuAccount.findFirst({
      where: {
        id,
        customer: { companyId },
      },
    });

    if (!account) {
      throw new Error("Susu account not found");
    }

    const updated = await prisma.susuAccount.update({
      where: { id },
      data,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        susuPlan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await AuditLogUtil.log({
      companyId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      entityType: "SUSU_ACCOUNT",
      entityId: id,
      changes: data,
    });

    console.log("✅ Susu account updated successfully");

    return updated;
  }

  async withdraw(
    id: string,
    companyId: string,
    amount: number,
    withdrawBy: string
  ) {
    if (amount <= 0) {
      throw new Error("Withdrawal amount must be greater than zero");
    }

    const account = await prisma.susuAccount.findFirst({
      where: {
        id,
        customer: { companyId },
      },
    });

    if (!account) {
      throw new Error("Susu account not found");
    }

    if (!account.isActive) {
      throw new Error("Account is not active");
    }

    const currentBalance = Number(account.balance);

    if (currentBalance < amount) {
      throw new Error(
        `Insufficient balance. Available: GH₵${currentBalance.toFixed(2)}, Requested: GH₵${amount.toFixed(2)}`
      );
    }

    const newBalance = currentBalance - amount;

    console.log("💸 Processing withdrawal:", {
      accountId: id,
      amount,
      currentBalance,
      newBalance,
    });

    // Update balance and create transaction
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.susuAccount.update({
        where: { id },
        data: { balance: newBalance },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          susuAccountId: id,
          type: TransactionType.WITHDRAWAL,
          amount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          reference: AccountNumberUtil.generateReference("WDL"),
          description: `Withdrawal from account ${account.accountNumber}`,
        },
      });

      return { updated, transaction };
    });

    await AuditLogUtil.log({
      companyId,
      userId: withdrawBy,
      action: AuditAction.UPDATE,
      entityType: "SUSU_ACCOUNT",
      entityId: id,
      changes: { withdrawal: amount, newBalance },
    });

    console.log("✅ Withdrawal processed successfully");

    return result;
  }

  async getTransactions(
    id: string,
    companyId: string,
    query: IPaginationQuery
  ) {
    const account = await prisma.susuAccount.findFirst({
      where: {
        id,
        customer: { companyId },
      },
    });

    if (!account) {
      throw new Error("Susu account not found");
    }

    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { susuAccountId: id },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.transaction.count({ where: { susuAccountId: id } }),
    ]);

    return PaginationUtil.formatPaginationResult(
      transactions,
      total,
      page,
      limit
    );
  }
}
