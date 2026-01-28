// src/modules/users/users.service.ts
import { prisma } from "../../config/database";
import { BcryptUtil } from "../../utils/bcrypt.util";
import { PaginationUtil } from "../../utils/pagination.util";
import { AuditLogUtil } from "../../utils/audit-log.util";
import { UserRole, AuditAction } from "../../types/enums";
import { IPaginationQuery } from "../../types/interfaces";
import { FileUploadUtil } from "../../utils/file-upload.util";

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
      branchIds?: string[];
      photoUrl?: string; // ✅ NEW
      photoPublicId?: string; // ✅ NEW
    },
    createdBy: string,
  ) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Validate branches if provided
    if (data.branchIds && data.branchIds.length > 0) {
      const branches = await prisma.branch.findMany({
        where: {
          id: { in: data.branchIds },
          companyId,
        },
      });

      if (branches.length !== data.branchIds.length) {
        throw new Error("One or more branches not found");
      }
    }

    // Hash password
    const hashedPassword = await BcryptUtil.hash(data.password);

    // Create user with branch assignments in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: data.role,
          companyId,
          photoUrl: data.photoUrl, // ✅ NEW
          photoPublicId: data.photoPublicId, // ✅ NEW
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          photoUrl: true, // ✅ NEW
          photoPublicId: true, // ✅ NEW
          createdAt: true,
        },
      });

      // Create branch assignments if provided
      if (data.branchIds && data.branchIds.length > 0) {
        await tx.agentBranchAssignment.createMany({
          data: data.branchIds.map((branchId) => ({
            userId: newUser.id,
            branchId,
            assignedBy: createdBy,
          })),
        });
      }

      return newUser;
    });

    await AuditLogUtil.log({
      companyId,
      userId: createdBy,
      action: AuditAction.CREATE,
      entityType: "USER",
      entityId: user.id,
      changes: {
        email: data.email,
        role: data.role,
        branchIds: data.branchIds,
        hasPhoto: !!data.photoUrl, // ✅ Log if photo was uploaded
      },
    });

    return this.getById(user.id, companyId);
  }

  async getAll(companyId: string | null, query: IPaginationQuery) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = {};

    // ✅ Only filter by companyId if not SUPER_ADMIN
    if (companyId !== null) {
      where.companyId = companyId;
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    // ✅ Filter by branch if provided (show agents assigned to specific branch)
    if (query.branchId) {
      where.assignedBranches = {
        some: {
          branchId: query.branchId,
        },
      };
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
          companyId: true,
          // ✅ Include assigned branches
          assignedBranches: {
            select: {
              id: true,
              branchId: true,
              assignedAt: true,
              branch: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  isActive: true,
                },
              },
            },
            orderBy: {
              assignedAt: "desc",
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              status: true,
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

  // Update getById to include photo fields
  async getById(id: string, companyId: string | null) {
    const where: any = { id };

    if (companyId !== null) {
      where.companyId = companyId;
    }

    const user = await prisma.user.findFirst({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLogin: true,
        companyId: true,
        photoUrl: true, // ✅ NEW
        photoPublicId: true, // ✅ NEW
        assignedBranches: {
          select: {
            id: true,
            branchId: true,
            assignedAt: true,
            assignedBy: true,
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
            assignedAt: "desc",
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            status: true,
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
      throw new Error("User not found");
    }

    return user;
  }

  async update(
    id: string,
    companyId: string | null,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      branchIds?: string[];
      isActive?: boolean;
      photoUrl?: string; // ✅ NEW
      photoPublicId?: string; // ✅ NEW
    },
    updatedBy: string,
  ) {
    const where: any = { id };

    if (companyId !== null) {
      where.companyId = companyId;
    }

    const user = await prisma.user.findFirst({
      where,
      select: {
        id: true,
        companyId: true,
        photoUrl: true,
        photoPublicId: true, // ✅ Get old photo info
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Validate branches if provided
    if (data.branchIds && data.branchIds.length > 0) {
      const branches = await prisma.branch.findMany({
        where: {
          id: { in: data.branchIds },
          companyId: user.companyId!,
        },
      });

      if (branches.length !== data.branchIds.length) {
        throw new Error("One or more branches not found");
      }
    }

    // ✅ Delete old photo from Cloudinary if new one is uploaded
    if (
      data.photoUrl &&
      user.photoPublicId &&
      data.photoUrl !== user.photoUrl
    ) {
      try {
        await FileUploadUtil.deleteImage(user.photoPublicId);
      } catch (error) {
        console.error("Error deleting old photo:", error);
        // Continue even if deletion fails
      }
    }

    // Update user and branch assignments in a transaction
    await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          isActive: data.isActive,
          photoUrl: data.photoUrl, // ✅ NEW
          photoPublicId: data.photoPublicId, // ✅ NEW
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          photoUrl: true, // ✅ NEW
          photoPublicId: true, // ✅ NEW
        },
      });

      // Update branch assignments if provided
      if (data.branchIds !== undefined) {
        await tx.agentBranchAssignment.deleteMany({
          where: { userId: id },
        });

        if (data.branchIds.length > 0) {
          await tx.agentBranchAssignment.createMany({
            data: data.branchIds.map((branchId) => ({
              userId: id,
              branchId,
              assignedBy: updatedBy,
            })),
          });
        }
      }

      return updatedUser; // optional, safe to keep
    });
    await AuditLogUtil.log({
      companyId: user.companyId!,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      entityType: "USER",
      entityId: id,
      changes: data,
    });

    return this.getById(id, companyId);
  }

  async delete(id: string, companyId: string | null, deletedBy: string) {
    const where: any = { id };

    if (companyId !== null) {
      where.companyId = companyId;
    }

    const user = await prisma.user.findFirst({
      where,
      select: {
        id: true,
        role: true,
        companyId: true,
        photoUrl: true,
        photoPublicId: true, // ✅ Get photo info for deletion
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role === UserRole.COMPANY_ADMIN) {
      const adminCount = await prisma.user.count({
        where: {
          companyId: user.companyId,
          role: UserRole.COMPANY_ADMIN,
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        throw new Error("Cannot delete the only active company admin");
      }
    }

    // ✅ Delete user photo from Cloudinary if exists
    if (user.photoPublicId) {
      try {
        await FileUploadUtil.deleteImage(user.photoPublicId);
      } catch (error) {
        console.error("Error deleting user photo:", error);
        // Continue even if deletion fails
      }
    }

    await prisma.user.delete({ where: { id } });

    await AuditLogUtil.log({
      companyId: user.companyId!,
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: "USER",
      entityId: id,
    });

    return { message: "User deleted successfully" };
  }

  async resetPassword(
    id: string,
    companyId: string | null,
    newPassword: string,
    resetBy: string,
  ) {
    const where: any = { id };

    // ✅ Only filter by companyId if not SUPER_ADMIN
    if (companyId !== null) {
      where.companyId = companyId;
    }

    const user = await prisma.user.findFirst({
      where,
    });

    if (!user) {
      throw new Error("User not found");
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

    // ✅ Use user's companyId for audit log
    await AuditLogUtil.log({
      companyId: user.companyId!,
      userId: resetBy,
      action: AuditAction.UPDATE,
      entityType: "USER",
      entityId: id,
      changes: { passwordReset: true },
    });

    return { message: "Password reset successfully" };
  }

  // ✅ NEW: Get branches assigned to an agent
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
        assignedAt: "desc",
      },
    });

    return assignments.map((a) => a.branch);
  }
}
