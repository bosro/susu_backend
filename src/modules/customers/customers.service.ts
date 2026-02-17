// src/modules/customers/customers.service.ts
import { prisma } from '../../config/database';
import { PaginationUtil } from '../../utils/pagination.util';
import { AuditLogUtil } from '../../utils/audit-log.util';
import { FileUploadUtil } from '../../utils/file-upload.util';
import { AuditAction, UserRole } from '../../types/enums';
import { IPaginationQuery } from '../../types/interfaces';

export class CustomersService {

  // ✅ HELPER: Get branch IDs assigned to an agent (mirrors collections.service.ts pattern)
  private async getAgentBranchIds(agentId: string): Promise<string[]> {
    const assignments = await prisma.agentBranchAssignment.findMany({
      where: { userId: agentId },
      include: {
        branch: {
          select: { id: true, isActive: true },
        },
      },
    });

    return assignments
      .filter(a => a.branch.isActive)
      .map(a => a.branchId);
  }

  async create(
    companyId: string,
    data: {
      firstName: string;
      lastName: string;
      phone: string;
      email?: string;
      address?: string;
      idNumber?: string;
      branchId: string;
    },
    createdBy: string
  ) {
    // Validate branch belongs to company
    const branch = await prisma.branch.findFirst({
      where: { id: data.branchId, companyId },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    // Check if customer with phone already exists in this company
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        companyId,
        phone: data.phone,
      },
    });

    if (existingCustomer) {
      throw new Error('Customer with this phone number already exists');
    }

    const customer = await prisma.customer.create({
      data: {
        companyId,
        branchId: data.branchId,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        idNumber: data.idNumber,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await AuditLogUtil.log({
      companyId,
      userId: createdBy,
      action: AuditAction.CREATE,
      entityType: 'CUSTOMER',
      entityId: customer.id,
      changes: data,
    });

    return customer;
  }

  async getAll(
    companyId: string | null,
    query: IPaginationQuery,
    userRole: UserRole,
    // ✅ FIX: accept userId instead of userBranchId — agents have multiple branches
    userId?: string
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = {};

    console.log('Customers query:', {
      companyId,
      userRole,
      userId,
      query,
    });

    // ✅ Only set companyId if not SUPER_ADMIN
    if (companyId !== null) {
      where.companyId = companyId;
    }

    // ✅ FIX: Role-based filtering — look up agent's assigned branches from DB
    if (userRole === UserRole.AGENT) {
      if (!userId) {
        throw new Error('Agent ID is required');
      }

      const branchIds = await this.getAgentBranchIds(userId);

      if (branchIds.length === 0) {
        console.warn('⚠️ Agent has no assigned branches');
        return PaginationUtil.formatPaginationResult([], 0, page, limit);
      }

      where.branchId = { in: branchIds };
      console.log('✅ Agent scope applied - filtered to branchIds:', branchIds);
    }

    // Additional filters
    if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { idNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    console.log('Final where clause:', JSON.stringify(where, null, 2));

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
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
          _count: {
            select: {
              susuAccounts: true,
              collections: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    console.log(`✅ Found ${customers.length} customers out of ${total} total`);

    return PaginationUtil.formatPaginationResult(customers, total, page, limit);
  }

  async getById(
    id: string,
    companyId: string | null,
    userRole: UserRole,
    // ✅ FIX: renamed param — we need userId to look up branches, not a single branchId
    userId?: string
  ) {
    const where: any = { id };

    // ✅ Only filter by companyId if not SUPER_ADMIN
    if (companyId !== null) {
      where.companyId = companyId;
    }

    // ✅ FIX: Agents can only see customers in their assigned branches
    //    Look up from AgentBranchAssignment — DO NOT rely on req.user.branchId
    if (userRole === UserRole.AGENT) {
      if (!userId) {
        throw new Error('Agent ID is required');
      }

      const branchIds = await this.getAgentBranchIds(userId);

      if (branchIds.length === 0) {
        throw new Error('Agent must be assigned to a branch');
      }

      where.branchId = { in: branchIds };
      console.log('✅ Agent accessing customer - filtered to branchIds:', branchIds);
    }

    console.log('getById where clause:', JSON.stringify(where, null, 2));

    const customer = await prisma.customer.findFirst({
      where,
      include: {
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
        susuAccounts: {
          include: {
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
        _count: {
          select: {
            collections: true,
          },
        },
      },
    });

    if (!customer) {
      throw new Error('Customer not found or you do not have access');
    }

    return customer;
  }

  async update(
    id: string,
    companyId: string | null,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      address?: string;
      idNumber?: string;
      branchId?: string;
      isActive?: boolean;
    },
    updatedBy: string
  ) {
    // ✅ Build where clause conditionally
    const where: any = { id };
    if (companyId !== null) {
      where.companyId = companyId;
    }

    const customer = await prisma.customer.findFirst({ where });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Validate branch if provided
    if (data.branchId && data.branchId !== customer.branchId) {
      const branch = await prisma.branch.findFirst({
        where: {
          id: data.branchId,
          ...(companyId !== null ? { companyId } : {}),
        },
      });

      if (!branch) {
        throw new Error('Branch not found');
      }
    }

    // Check if phone is being changed and if it's already in use
    if (data.phone && data.phone !== customer.phone) {
      const existingWhere: any = {
        phone: data.phone,
        id: { not: id },
      };
      if (companyId !== null) {
        existingWhere.companyId = companyId;
      }

      const existingCustomer = await prisma.customer.findFirst({
        where: existingWhere,
      });

      if (existingCustomer) {
        throw new Error('Customer with this phone number already exists');
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await AuditLogUtil.log({
      companyId: customer.companyId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      entityType: 'CUSTOMER',
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

    const customer = await prisma.customer.findFirst({
      where,
      include: {
        _count: {
          select: {
            susuAccounts: true,
            collections: true,
          },
        },
      },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    if (customer._count.susuAccounts > 0) {
      throw new Error(
        `Cannot delete customer with ${customer._count.susuAccounts} active susu account(s). Please deactivate or transfer accounts first.`
      );
    }

    if (customer._count.collections > 0) {
      throw new Error(
        `Cannot delete customer with ${customer._count.collections} collection record(s). Consider deactivating instead.`
      );
    }

    await prisma.customer.delete({ where: { id } });

    await AuditLogUtil.log({
      companyId: customer.companyId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: 'CUSTOMER',
      entityId: id,
    });

    return { message: 'Customer deleted successfully' };
  }

  async uploadPhoto(
    id: string,
    companyId: string | null,
    file: Buffer,
    uploadedBy: string
  ) {
    const where: any = { id };
    if (companyId !== null) {
      where.companyId = companyId;
    }

    const customer = await prisma.customer.findFirst({ where });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Delete old photo if exists
    if (customer.photoUrl) {
      try {
        const publicId = FileUploadUtil.extractPublicId(customer.photoUrl);
        await FileUploadUtil.deleteImage(publicId);
      } catch (error) {
        console.warn('Failed to delete old photo:', error);
      }
    }

    const { url } = await FileUploadUtil.uploadImage(
      file,
      `customers/${customer.companyId}`
    );

    const updated = await prisma.customer.update({
      where: { id },
      data: { photoUrl: url },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await AuditLogUtil.log({
      companyId: customer.companyId,
      userId: uploadedBy,
      action: AuditAction.UPDATE,
      entityType: 'CUSTOMER',
      entityId: id,
      changes: { photoUrl: url },
    });

    return updated;
  }

  async getCustomerStats(id: string, companyId: string | null) {
    const where: any = { id };
    if (companyId !== null) {
      where.companyId = companyId;
    }

    const customer = await prisma.customer.findFirst({ where });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const [
      totalAccounts,
      activeAccounts,
      totalBalance,
      totalCollections,
      recentCollections,
    ] = await Promise.all([
      prisma.susuAccount.count({ where: { customerId: id } }),
      prisma.susuAccount.count({ where: { customerId: id, isActive: true } }),
      prisma.susuAccount.aggregate({
        where: { customerId: id, isActive: true },
        _sum: { balance: true },
      }),
      prisma.collection.aggregate({
        where: { customerId: id },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.collection.findMany({
        where: { customerId: id },
        take: 5,
        orderBy: { collectionDate: 'desc' },
        select: {
          id: true,
          amount: true,
          collectionDate: true,
          status: true,
          susuAccount: {
            select: {
              id: true,
              accountNumber: true,
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
      }),
    ]);

    return {
      totalAccounts,
      activeAccounts,
      totalBalance: totalBalance._sum.balance || 0,
      totalCollections: {
        amount: totalCollections._sum.amount || 0,
        count: totalCollections._count,
      },
      recentCollections,
    };
  }
}