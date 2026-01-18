// src/modules/susu-plans/susu-plans.service.ts
import { prisma } from "../../config/database";
import { PaginationUtil } from "../../utils/pagination.util";
import { AuditLogUtil } from "../../utils/audit-log.util";
import { FileUploadUtil } from "../../utils/file-upload.util";
import { AuditAction, SusuPlanType } from "../../types/enums";
import { IPaginationQuery } from "../../types/interfaces";

export class SusuPlansService {
  async create(
    companyId: string,
    data: {
      name: string;
      description?: string;
      type: SusuPlanType;
      amount: number;
      frequency?: string;
      duration?: number;
      targetAmount?: number;
    },
    createdBy: string
  ) {
    console.log("📋 Creating susu plan:", {
      companyId,
      name: data.name,
      type: data.type,
    });

    // Validate plan type specific requirements
    if (data.type === SusuPlanType.DURATION_BASED && !data.duration) {
      throw new Error("Duration is required for duration-based plans");
    }

    if (data.type === SusuPlanType.TARGET_SAVINGS && !data.targetAmount) {
      throw new Error("Target amount is required for target savings plans");
    }

    const susuPlan = await prisma.susuPlan.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        type: data.type,
        amount: data.amount,
        frequency: data.frequency,
        duration: data.duration,
        targetAmount: data.targetAmount,
      },
      include: {
        company: {  // ✅ Include company info for super admin
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            susuAccounts: true,
          },
        },
      },
    });

    await AuditLogUtil.log({
      companyId,
      userId: createdBy,
      action: AuditAction.CREATE,
      entityType: "SUSU_PLAN",
      entityId: susuPlan.id,
      changes: data,
    });

    console.log("✅ Susu plan created:", susuPlan.name);

    return susuPlan;
  }

  async getAll(companyId: string | null, query: IPaginationQuery) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = {};

    console.log("Susu plans query:", { companyId, query });

    // ✅ Only set companyId if not SUPER_ADMIN
    if (companyId !== null) {
      where.companyId = companyId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    console.log("Final where clause:", JSON.stringify(where, null, 2));

    const [susuPlans, total] = await Promise.all([
      prisma.susuPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          company: {  // ✅ Include company info for super admin
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              susuAccounts: true,
            },
          },
        },
      }),
      prisma.susuPlan.count({ where }),
    ]);

    console.log(
      `✅ Found ${susuPlans.length} susu plans out of ${total} total`
    );

    return PaginationUtil.formatPaginationResult(susuPlans, total, page, limit);
  }

  async getById(id: string, companyId: string | null) {
    const where: any = { id };

    // ✅ Only filter by companyId if not SUPER_ADMIN
    if (companyId !== null) {
      where.companyId = companyId;
    }

    const susuPlan = await prisma.susuPlan.findFirst({
      where,
      include: {
        company: {  // ✅ Include company info
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            susuAccounts: true,
          },
        },
      },
    });

    if (!susuPlan) {
      throw new Error("Susu plan not found");
    }

    return susuPlan;
  }

  async update(
    id: string,
    companyId: string | null,  // ✅ Can be null for SUPER_ADMIN
    data: {
      name?: string;
      description?: string;
      type?: SusuPlanType;
      amount?: number;
      frequency?: string;
      duration?: number;
      targetAmount?: number;
      isActive?: boolean;
    },
    updatedBy: string
  ) {
    const where: any = { id };
    if (companyId !== null) {
      where.companyId = companyId;
    }

    const susuPlan = await prisma.susuPlan.findFirst({
      where,
    });

    if (!susuPlan) {
      throw new Error("Susu plan not found");
    }

    // Validate type-specific requirements if type is being updated
    const newType = data.type || susuPlan.type;

    if (newType === SusuPlanType.DURATION_BASED) {
      const newDuration =
        data.duration !== undefined ? data.duration : susuPlan.duration;
      if (!newDuration) {
        throw new Error("Duration is required for duration-based plans");
      }
    }

    if (newType === SusuPlanType.TARGET_SAVINGS) {
      const newTargetAmount =
        data.targetAmount !== undefined
          ? data.targetAmount
          : susuPlan.targetAmount;
      if (!newTargetAmount) {
        throw new Error("Target amount is required for target savings plans");
      }
    }

    const updated = await prisma.susuPlan.update({
      where: { id },
      data,
      include: {
        company: {  // ✅ Include company info
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            susuAccounts: true,
          },
        },
      },
    });

    await AuditLogUtil.log({
      companyId: susuPlan.companyId,  // ✅ Use plan's actual companyId
      userId: updatedBy,
      action: AuditAction.UPDATE,
      entityType: "SUSU_PLAN",
      entityId: id,
      changes: data,
    });

    console.log("✅ Susu plan updated successfully");

    return updated;
  }

  async delete(id: string, companyId: string | null, deletedBy: string) {
    const where: any = { id };
    if (companyId !== null) {
      where.companyId = companyId;
    }

    const susuPlan = await prisma.susuPlan.findFirst({
      where,
      include: {
        _count: {
          select: {
            susuAccounts: true,
          },
        },
      },
    });

    if (!susuPlan) {
      throw new Error("Susu plan not found");
    }

    if (susuPlan._count.susuAccounts > 0) {
      throw new Error(
        `Cannot delete susu plan with ${susuPlan._count.susuAccounts} active account(s). Please deactivate or reassign accounts first.`
      );
    }

    await prisma.susuPlan.delete({ where: { id } });

    await AuditLogUtil.log({
      companyId: susuPlan.companyId,  // ✅ Use plan's actual companyId
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: "SUSU_PLAN",
      entityId: id,
    });

    console.log("✅ Susu plan deleted successfully");

    return { message: "Susu plan deleted successfully" };
  }

  async uploadImage(
    id: string,
    companyId: string | null,  // ✅ Can be null for SUPER_ADMIN
    file: Buffer,
    uploadedBy: string
  ) {
    const where: any = { id };
    if (companyId !== null) {
      where.companyId = companyId;
    }

    const susuPlan = await prisma.susuPlan.findFirst({
      where,
    });

    if (!susuPlan) {
      throw new Error("Susu plan not found");
    }

    // Delete old image if exists
    if (susuPlan.imageUrl) {
      try {
        const publicId = FileUploadUtil.extractPublicId(susuPlan.imageUrl);
        await FileUploadUtil.deleteImage(publicId);
      } catch (error) {
        console.warn("Failed to delete old image:", error);
        // Continue with upload even if deletion fails
      }
    }

    // Upload new image - use plan's actual companyId
    const { url } = await FileUploadUtil.uploadImage(
      file,
      `susu-plans/${susuPlan.companyId}`
    );

    const updated = await prisma.susuPlan.update({
      where: { id },
      data: { imageUrl: url },
      include: {
        company: {  // ✅ Include company info
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            susuAccounts: true,
          },
        },
      },
    });

    await AuditLogUtil.log({
      companyId: susuPlan.companyId,  // ✅ Use plan's actual companyId
      userId: uploadedBy,
      action: AuditAction.UPDATE,
      entityType: "SUSU_PLAN",
      entityId: id,
      changes: { imageUrl: url },
    });

    console.log("✅ Susu plan image uploaded successfully");

    return updated;
  }
}