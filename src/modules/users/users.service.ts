// src/modules/users/users.service.ts
import { prisma } from '../../config/database';
import { BcryptUtil } from '../../utils/bcrypt.util';
import { PaginationUtil } from '../../utils/pagination.util';
import { AuditLogUtil } from '../../utils/audit-log.util';
import { UserRole, AuditAction } from '../../types/enums';
import { IPaginationQuery } from '../../types/interfaces';

export class UsersService {
  async create(
    companyId: string,
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role: UserRole;
      branchId?: string;
    },
    createdBy: string
  ) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate branch if provided
    if (data.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: data.branchId, companyId },
      });

      if (!branch) {
        throw new Error('Branch not found');
      }
    }

    // Hash password
    const hashedPassword = await BcryptUtil.hash(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        companyId,
        branchId: data.branchId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
    });

    await AuditLogUtil.log({
      companyId,
      userId: createdBy,
      action: AuditAction.CREATE,
      entityType: 'USER',
      entityId: user.id,
      changes: { email: data.email, role: data.role },
    });

    return user;
  }

  async getAll(companyId: string, query: IPaginationQuery) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = { companyId };

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          lastLogin: true,
          branchId: true,
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return PaginationUtil.formatPaginationResult(users, total, page, limit);
  }

  async getById(id: string, companyId: string) {
    const user = await prisma.user.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLogin: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            collectionsRecorded: true,
            dailySummaries: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async update(
    id: string,
    companyId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      branchId?: string | null;
      isActive?: boolean;
    },
    updatedBy: string
  ) {
    const user = await prisma.user.findFirst({
      where: { id, companyId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Validate branch if provided
    if (data.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: data.branchId, companyId },
      });

      if (!branch) {
        throw new Error('Branch not found');
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        branchId: true,
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
      entityType: 'USER',
      entityId: id,
      changes: data,
    });

    return updated;
  }

  async delete(id: string, companyId: string, deletedBy: string) {
    const user = await prisma.user.findFirst({
      where: { id, companyId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === UserRole.COMPANY_ADMIN) {
      // Check if this is the only company admin
      const adminCount = await prisma.user.count({
        where: {
          companyId,
          role: UserRole.COMPANY_ADMIN,
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        throw new Error('Cannot delete the only active company admin');
      }
    }

    await prisma.user.delete({ where: { id } });

    await AuditLogUtil.log({
      companyId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: 'USER',
      entityId: id,
    });

    return { message: 'User deleted successfully' };
  }

  async resetPassword(id: string, companyId: string, newPassword: string, resetBy: string) {
    const user = await prisma.user.findFirst({
      where: { id, companyId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const hashedPassword = await BcryptUtil.hash(newPassword);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens for this user
    await prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    await AuditLogUtil.log({
      companyId,
      userId: resetBy,
      action: AuditAction.UPDATE,
      entityType: 'USER',
      entityId: id,
      changes: { passwordReset: true },
    });

    return { message: 'Password reset successfully' };
  }
}