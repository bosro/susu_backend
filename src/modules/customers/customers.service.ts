// src/modules/customers/customers.service.ts
import { prisma } from '../../config/database';
import { PaginationUtil } from '../../utils/pagination.util';
import { AuditLogUtil } from '../../utils/audit-log.util';
import { FileUploadUtil } from '../../utils/file-upload.util';
import { AuditAction, UserRole } from '../../types/enums';
import { IPaginationQuery } from '../../types/interfaces';

export class CustomersService {
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
    companyId: string,
    query: IPaginationQuery,
    userRole: UserRole,
    branchId?: string
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = { companyId };

    console.log('Customers query:', { companyId, userRole, branchId, query }); // ✅ Debug log

    // ✅ CRITICAL: Role-based data scoping
    if (userRole === UserRole.AGENT) {
      // Agents can ONLY see customers in their branch
      if (!branchId) {
        console.warn('❌ Agent has no branch assignment');
        throw new Error('Agent must be assigned to a branch');
      }
      where.branchId = branchId;
      console.log('✅ Agent scope applied - filtered to branchId:', branchId);
    } else if (userRole === UserRole.COMPANY_ADMIN) {
      // Company admins see all customers in their company
      // But can optionally filter by branch
      if (query.branchId) {
        where.branchId = query.branchId;
      }
      console.log('✅ Company admin scope - can see all company customers');
    }
    // SUPER_ADMIN sees everything (no additional filtering)

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    console.log('Final where clause:', JSON.stringify(where, null, 2)); // ✅ Debug log

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

    console.log(`✅ Found ${customers.length} customers out of ${total} total`); // ✅ Debug log

    return PaginationUtil.formatPaginationResult(customers, total, page, limit);
  }

  async getById(
    id: string,
    companyId: string,
    userRole: UserRole,
    branchId?: string
  ) {
    const where: any = { id, companyId };

    // ✅ Agents can only see customers in their branch
    if (userRole === UserRole.AGENT) {
      if (!branchId) {
        throw new Error('Agent must be assigned to a branch');
      }
      where.branchId = branchId;
      console.log('✅ Agent accessing customer - filtered to branchId:', branchId);
    }

    const customer = await prisma.customer.findFirst({
      where,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
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
    companyId: string,
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
    const customer = await prisma.customer.findFirst({
      where: { id, companyId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Validate branch if provided
    if (data.branchId && data.branchId !== customer.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: data.branchId, companyId },
      });

      if (!branch) {
        throw new Error('Branch not found');
      }
    }

    // Check if phone is being changed and if it's already in use
    if (data.phone && data.phone !== customer.phone) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          companyId,
          phone: data.phone,
          id: { not: id },
        },
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
      companyId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      entityType: 'CUSTOMER',
      entityId: id,
      changes: data,
    });

    return updated;
  }

  async delete(id: string, companyId: string, deletedBy: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, companyId },
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

    // ✅ Enhanced validation
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
      companyId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: 'CUSTOMER',
      entityId: id,
    });

    return { message: 'Customer deleted successfully' };
  }

  async uploadPhoto(
    id: string,
    companyId: string,
    file: Buffer,
    uploadedBy: string
  ) {
    const customer = await prisma.customer.findFirst({
      where: { id, companyId },
    });

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
        // Continue with upload even if deletion fails
      }
    }

    // Upload new photo
    const { url } = await FileUploadUtil.uploadImage(
      file,
      `customers/${companyId}`
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
      companyId,
      userId: uploadedBy,
      action: AuditAction.UPDATE,
      entityType: 'CUSTOMER',
      entityId: id,
      changes: { photoUrl: url },
    });

    return updated;
  }

  async getCustomerStats(id: string, companyId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, companyId },
    });

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