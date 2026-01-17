// src/modules/branches/branches.service.ts
import { prisma } from '../../config/database';
import { PaginationUtil } from '../../utils/pagination.util';
import { AuditLogUtil } from '../../utils/audit-log.util';
import { AuditAction } from '../../types/enums';
import { IPaginationQuery } from '../../types/interfaces';

export class BranchesService {
  async create(
    companyId: string,
    data: {
      name: string;
      address?: string;
      phone?: string;
    },
    createdBy: string
  ) {
    console.log('🏢 Creating branch:', { companyId, name: data.name });

    // Check if branch name already exists in this company
    const existingBranch = await prisma.branch.findFirst({
      where: {
        companyId,
        name: data.name,
      },
    });

    if (existingBranch) {
      throw new Error('Branch with this name already exists');
    }

    const branch = await prisma.branch.create({
      data: {
        companyId,
        name: data.name,
        address: data.address,
        phone: data.phone,
      },
      include: {
        _count: {
          select: {
            agents: true,
            customers: true,
          },
        },
      },
    });

    await AuditLogUtil.log({
      companyId,
      userId: createdBy,
      action: AuditAction.CREATE,
      entityType: 'BRANCH',
      entityId: branch.id,
      changes: data,
    });

    console.log('✅ Branch created:', branch.name);

    return branch;
  }

  async getAll(companyId: string, query: IPaginationQuery) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = { companyId };

    console.log('Branches query:', { companyId, query });

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    console.log('Final where clause:', JSON.stringify(where, null, 2));

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              agents: true,
              customers: true,
              collections: true,
            },
          },
        },
      }),
      prisma.branch.count({ where }),
    ]);

    console.log(`✅ Found ${branches.length} branches out of ${total} total`);

    return PaginationUtil.formatPaginationResult(branches, total, page, limit);
  }

  async getById(id: string, companyId: string) {
    const branch = await prisma.branch.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: {
            agents: true,
            customers: true,
            collections: true,
          },
        },
        agents: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
            lastLogin: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    return branch;
  }

  async update(
    id: string,
    companyId: string,
    data: {
      name?: string;
      address?: string;
      phone?: string;
      isActive?: boolean;
    },
    updatedBy: string
  ) {
    const branch = await prisma.branch.findFirst({
      where: { id, companyId },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    // Check if name is being changed and if it's already in use
    if (data.name && data.name !== branch.name) {
      const existingBranch = await prisma.branch.findFirst({
        where: {
          companyId,
          name: data.name,
          id: { not: id },
        },
      });

      if (existingBranch) {
        throw new Error('Branch with this name already exists');
      }
    }

    const updated = await prisma.branch.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            agents: true,
            customers: true,
          },
        },
      },
    });

    await AuditLogUtil.log({
      companyId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      entityType: 'BRANCH',
      entityId: id,
      changes: data,
    });

    console.log('✅ Branch updated successfully');

    return updated;
  }

  async delete(id: string, companyId: string, deletedBy: string) {
    const branch = await prisma.branch.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: {
            customers: true,
            agents: true,
          },
        },
      },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    if (branch._count.customers > 0 || branch._count.agents > 0) {
      throw new Error(
        `Cannot delete branch with ${branch._count.agents} agent(s) and ${branch._count.customers} customer(s). Please reassign them first.`
      );
    }

    await prisma.branch.delete({ where: { id } });

    await AuditLogUtil.log({
      companyId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: 'BRANCH',
      entityId: id,
    });

    console.log('✅ Branch deleted successfully');

    return { message: 'Branch deleted successfully' };
  }

  async getStats(id: string, companyId: string) {
    const branch = await prisma.branch.findFirst({
      where: { id, companyId },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalAgents,
      activeAgents,
      totalCustomers,
      activeCustomers,
      todayCollections,
      monthCollections,
    ] = await Promise.all([
      prisma.user.count({ where: { branchId: id } }),
      prisma.user.count({ where: { branchId: id, isActive: true } }),
      prisma.customer.count({ where: { branchId: id } }),
      prisma.customer.count({ where: { branchId: id, isActive: true } }),
      prisma.collection.aggregate({
        where: {
          branchId: id,
          collectionDate: {
            gte: startOfToday,
          },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.collection.aggregate({
        where: {
          branchId: id,
          collectionDate: {
            gte: startOfMonth,
          },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalAgents,
      activeAgents,
      totalCustomers,
      activeCustomers,
      todayCollections: {
        amount: todayCollections._sum.amount || 0,
        count: todayCollections._count,
      },
      monthCollections: {
        amount: monthCollections._sum.amount || 0,
        count: monthCollections._count,
      },
    };
  }
}