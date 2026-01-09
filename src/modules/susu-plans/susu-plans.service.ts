// src/modules/susu-plans/susu-plans.service.ts
import { prisma } from '../../config/database';
import { PaginationUtil } from '../../utils/pagination.util';
import { AuditLogUtil } from '../../utils/audit-log.util';
import { FileUploadUtil } from '../../utils/file-upload.util';
import { AuditAction, SusuPlanType } from '../../types/enums';
import { IPaginationQuery } from '../../types/interfaces';

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
      entityType: 'SUSU_PLAN',
      entityId: susuPlan.id,
      changes: data,
    });

    return susuPlan;
  }

  async getAll(companyId: string, query: IPaginationQuery) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = { companyId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [susuPlans, total] = await Promise.all([
      prisma.susuPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              susuAccounts: true,
            },
          },
        },
      }),
      prisma.susuPlan.count({ where }),
    ]);

    return PaginationUtil.formatPaginationResult(susuPlans, total, page, limit);
  }

  async getById(id: string, companyId: string) {
    const susuPlan = await prisma.susuPlan.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: {
            susuAccounts: true,
          },
        },
      },
    });

    if (!susuPlan) {
      throw new Error('Susu plan not found');
    }

    return susuPlan;
  }

  async update(
    id: string,
    companyId: string,
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
    const susuPlan = await prisma.susuPlan.findFirst({
      where: { id, companyId },
    });

    if (!susuPlan) {
      throw new Error('Susu plan not found');
    }

    const updated = await prisma.susuPlan.update({
      where: { id },
      data,
    });

    await AuditLogUtil.log({
      companyId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      entityType: 'SUSU_PLAN',
      entityId: id,
      changes: data,
    });

    return updated;
  }

  async delete(id: string, companyId: string, deletedBy: string) {
    const susuPlan = await prisma.susuPlan.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: {
            susuAccounts: true,
          },
        },
      },
    });

    if (!susuPlan) {
      throw new Error('Susu plan not found');
    }

    if (susuPlan._count.susuAccounts > 0) {
      throw new Error('Cannot delete susu plan with existing accounts');
    }

    await prisma.susuPlan.delete({ where: { id } });

    await AuditLogUtil.log({
      companyId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: 'SUSU_PLAN',
      entityId: id,
    });

    return { message: 'Susu plan deleted successfully' };
  }

  async uploadImage(id: string, companyId: string, file: Buffer, uploadedBy: string) {
    const susuPlan = await prisma.susuPlan.findFirst({
      where: { id, companyId },
    });

    if (!susuPlan) {
      throw new Error('Susu plan not found');
    }

    // Delete old image if exists
    if (susuPlan.imageUrl) {
      const publicId = FileUploadUtil.extractPublicId(susuPlan.imageUrl);
      await FileUploadUtil.deleteImage(publicId);
    }

    // Upload new image
    const { url } = await FileUploadUtil.uploadImage(file, `susu-plans/${companyId}`);

    const updated = await prisma.susuPlan.update({
      where: { id },
      data: { imageUrl: url },
    });

    await AuditLogUtil.log({
      companyId,
      userId: uploadedBy,
      action: AuditAction.UPDATE,
      entityType: 'SUSU_PLAN',
      entityId: id,
      changes: { imageUrl: url },
    });

    return updated;
  }
}