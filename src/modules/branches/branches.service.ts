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

    return branch;
  }

  async getAll(companyId: string, query: IPaginationQuery) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = { companyId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

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

    const updated = await prisma.branch.update({
      where: { id },
      data,
    });

    await AuditLogUtil.log({
      companyId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      entityType: 'BRANCH',
      entityId: id,
      changes: data,
    });

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
      throw new Error('Cannot delete branch with existing customers or agents');
    }

    await prisma.branch.delete({ where: { id } });

    await AuditLogUtil.log({
      companyId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: 'BRANCH',
      entityId: id,
    });

    return { message: 'Branch deleted successfully' };
  }

  async getStats(id: string, companyId: string) {
    const branch = await prisma.branch.findFirst({
      where: { id, companyId },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

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
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.collection.aggregate({
        where: {
          branchId: id,
          collectionDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
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