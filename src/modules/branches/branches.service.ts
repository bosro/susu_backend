// src/modules/branches/branches.service.ts
// ✅ FIXED: Parse isActive query param from string to boolean for Prisma

import { prisma } from '../../config/database';
import { PaginationUtil } from '../../utils/pagination.util';
import { AuditLogUtil } from '../../utils/audit-log.util';
import { UserRole, AuditAction } from '../../types/enums';
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

  async getAll(
    companyId: string | null,
    query: IPaginationQuery & {
      userRole?: UserRole;
      userId?: string;
    }
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = {};

    if (companyId !== null) {
      where.companyId = companyId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // ✅ FIX: Parse isActive from string to boolean
    //    Frontend sends ?isActive=true which becomes the STRING 'true'
    //    Prisma expects boolean true, so we must parse it
    if (query.isActive !== undefined) {
      // Cast to any because at runtime it's a string, but TypeScript thinks it's boolean
      where.isActive = query.isActive === true || (query.isActive as any) === 'true';
    }

    // ✅ Filter by agent's assigned branches
    if (query.userRole === UserRole.AGENT && query.userId) {
      const assignments = await prisma.agentBranchAssignment.findMany({
        where: { userId: query.userId },
        select: { branchId: true },
      });

      const branchIds = assignments.map(a => a.branchId);

      if (branchIds.length === 0) {
        console.log(`⚠️ Agent ${query.userId} has no assigned branches`);
        return PaginationUtil.formatPaginationResult([], 0, page, limit);
      }

      where.id = { in: branchIds };
      
      console.log(`✅ Filtering branches for agent ${query.userId}: ${branchIds.length} branches`);
    }

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          assignedAgents: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              customers: true,
              collections: true,
            },
          },
        },
      }),
      prisma.branch.count({ where }),
    ]);

    console.log(`✅ Found ${branches.length} branches for query`);

    return PaginationUtil.formatPaginationResult(branches, total, page, limit);
  }

  async getById(id: string, companyId: string | null) {
    const where: any = { id };

    if (companyId !== null) {
      where.companyId = companyId;
    }

    const branch = await prisma.branch.findFirst({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
        assignedAgents: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
        _count: {
          select: {
            customers: true,
            collections: true,
            dailySummaries: true,
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
    companyId: string | null,
    data: {
      name?: string;
      address?: string;
      phone?: string;
      isActive?: boolean;
    },
    updatedBy: string
  ) {
    const where: any = { id };

    if (companyId !== null) {
      where.companyId = companyId;
    }

    const branch = await prisma.branch.findFirst({ where });

    if (!branch) {
      throw new Error('Branch not found');
    }

    if (data.isActive === false && branch.isActive) {
      const assignedCount = await prisma.agentBranchAssignment.count({
        where: { branchId: id },
      });

      if (assignedCount > 0) {
        console.warn(
          `⚠️ Deactivating branch with ${assignedCount} assigned agents`
        );
      }
    }

    const updated = await prisma.branch.update({
      where: { id },
      data,
    });

    await AuditLogUtil.log({
      companyId: branch.companyId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      entityType: 'BRANCH',
      entityId: id,
      changes: data,
    });

    return updated;
  }

  async delete(id: string, companyId: string | null, deletedBy: string) {
    const where: any = { id };

    if (companyId !== null) {
      where.companyId = companyId;
    }

    const branch = await prisma.branch.findFirst({
      where,
      include: {
        _count: {
          select: {
            customers: true,
            collections: true,
            assignedAgents: true,
          },
        },
      },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    if (branch._count.customers > 0) {
      throw new Error(
        `Cannot delete branch with ${branch._count.customers} customers. Please transfer customers first.`
      );
    }

    if (branch._count.collections > 0) {
      throw new Error(
        `Cannot delete branch with ${branch._count.collections} collections. Please archive the branch instead.`
      );
    }

    if (branch._count.assignedAgents > 0) {
      console.warn(
        `⚠️ Deleting branch with ${branch._count.assignedAgents} assigned agents`
      );
    }

    await prisma.branch.delete({ where: { id } });

    await AuditLogUtil.log({
      companyId: branch.companyId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: 'BRANCH',
      entityId: id,
    });

    return { message: 'Branch deleted successfully' };
  }

  async getAgentBranches(userId: string) {
    const assignments = await prisma.agentBranchAssignment.findMany({
      where: { userId },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            isActive: true,
            companyId: true,
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

  async getBranchAgents(branchId: string) {
    const assignments = await prisma.agentBranchAssignment.findMany({
      where: { branchId },
      include: {
        user: {
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
      orderBy: {
        assignedAt: 'desc',
      },
    });

    return assignments.map(a => ({
      ...a.user,
      assignedAt: a.assignedAt,
      assignmentId: a.id,
    }));
  }
}