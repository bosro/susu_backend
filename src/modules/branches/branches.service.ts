// src/modules/branches/branches.service.ts
// ✅ Updated to support filtering by agent's assigned branches

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

    // ✅ Only filter by companyId if not SUPER_ADMIN
    if (companyId !== null) {
      where.companyId = companyId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    // ✅ NEW: Filter by agent's assigned branches
    if (query.userRole === UserRole.AGENT && query.userId) {
      // Get branches assigned to this agent
      const assignments = await prisma.agentBranchAssignment.findMany({
        where: { userId: query.userId },
        select: { branchId: true },
      });

      const branchIds = assignments.map(a => a.branchId);

      if (branchIds.length === 0) {
        // Agent has no assigned branches - return empty result
        return PaginationUtil.formatPaginationResult([], 0, page, limit);
      }

      // Filter to only show assigned branches
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
          // ✅ Include count of assigned agents
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

    return PaginationUtil.formatPaginationResult(branches, total, page, limit);
  }

  async getById(id: string, companyId: string | null) {
    const where: any = { id };

    // ✅ Only filter by companyId if not SUPER_ADMIN
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
        // ✅ Include assigned agents
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

    // ✅ Only filter by companyId if not SUPER_ADMIN
    if (companyId !== null) {
      where.companyId = companyId;
    }

    const branch = await prisma.branch.findFirst({
      where,
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    // If deactivating branch, warn about assigned agents
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

    // ✅ Only filter by companyId if not SUPER_ADMIN
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

    // Check if branch has any data
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
      // Agent assignments will be automatically deleted via CASCADE
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

  // ✅ NEW: Get branches for a specific agent
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

  // ✅ NEW: Get agents for a specific branch
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