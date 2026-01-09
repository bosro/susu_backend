// src/modules/susu-accounts/susu-accounts.service.ts
import { prisma } from '../../config/database';
import { PaginationUtil } from '../../utils/pagination.util';
import { AuditLogUtil } from '../../utils/audit-log.util';
import { AccountNumberUtil } from '../../utils/account-number.util';
import { AuditAction, UserRole, TransactionType } from '../../types/enums';
import { IPaginationQuery } from '../../types/interfaces';

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
    // Validate customer belongs to company
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Validate susu plan belongs to company
    const susuPlan = await prisma.susuPlan.findFirst({
      where: { id: data.susuPlanId, companyId },
    });

    if (!susuPlan) {
      throw new Error('Susu plan not found');
    }

    // Generate unique account number
    const accountNumber = AccountNumberUtil.generate('SUS');

    const susuAccount = await prisma.susuAccount.create({
      data: {
        customerId: data.customerId,
        susuPlanId: data.susuPlanId,
        accountNumber,
        targetAmount: data.targetAmount || susuPlan.targetAmount,
        startDate: data.startDate || new Date(),
        endDate: data.endDate,
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
      entityType: 'SUSU_ACCOUNT',
      entityId: susuAccount.id,
      changes: data,
    });

    return susuAccount;
  }

  async getAll(companyId: string, query: IPaginationQuery, userRole: UserRole, branchId?: string) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = {
      customer: { companyId },
    };

    // Agents can only see accounts in their branch
    if (userRole === UserRole.AGENT && branchId) {
      where.customer.branchId = branchId;
    }

    if (query.search) {
      where.OR = [
        { accountNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.susuPlanId) {
      where.susuPlanId = query.susuPlanId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

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

    return PaginationUtil.formatPaginationResult(accounts, total, page, limit);
  }

  async getById(id: string, companyId: string, userRole: UserRole, branchId?: string) {
    const where: any = {
      id,
      customer: { companyId },
    };

    // Agents can only see accounts in their branch
    if (userRole === UserRole.AGENT && branchId) {
      where.customer.branchId = branchId;
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
      throw new Error('Susu account not found');
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
      throw new Error('Susu account not found');
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
      entityType: 'SUSU_ACCOUNT',
      entityId: id,
      changes: data,
    });

    return updated;
  }

  async withdraw(
    id: string,
    companyId: string,
    amount: number,
    withdrawBy: string
  ) {
    const account = await prisma.susuAccount.findFirst({
      where: {
        id,
        customer: { companyId },
      },
    });

    if (!account) {
      throw new Error('Susu account not found');
    }

    if (!account.isActive) {
      throw new Error('Account is not active');
    }

    if (account.balance.toNumber() < amount) {
      throw new Error('Insufficient balance');
    }

    const newBalance = account.balance.toNumber() - amount;

    // Update balance and create transaction
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.susuAccount.update({
        where: { id },
        data: { balance: newBalance },
      });

      const transaction = await tx.transaction.create({
        data: {
          susuAccountId: id,
          type: TransactionType.WITHDRAWAL,
          amount,
          balanceBefore: account.balance,
          balanceAfter: newBalance,
          reference: AccountNumberUtil.generateReference('WDL'),
          description: `Withdrawal from account ${account.accountNumber}`,
        },
      });

      return { updated, transaction };
    });

    await AuditLogUtil.log({
      companyId,
      userId: withdrawBy,
      action: AuditAction.UPDATE,
      entityType: 'SUSU_ACCOUNT',
      entityId: id,
      changes: { withdrawal: amount, newBalance },
    });

    return result;
  }

  async getTransactions(id: string, companyId: string, query: IPaginationQuery) {
    const account = await prisma.susuAccount.findFirst({
      where: {
        id,
        customer: { companyId },
      },
    });

    if (!account) {
      throw new Error('Susu account not found');
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

    return PaginationUtil.formatPaginationResult(transactions, total, page, limit);
  }
}