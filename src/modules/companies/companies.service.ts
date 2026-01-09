// src/modules/companies/companies.service.ts
import { prisma } from '../../config/database';
import { FileUploadUtil } from '../../utils/file-upload.util';
import { PaginationUtil } from '../../utils/pagination.util';
import { AuditLogUtil } from '../../utils/audit-log.util';
import { CompanyStatus, AuditAction } from '../../types/enums';
import { IPaginationQuery } from '../../types/interfaces';

export class CompaniesService {
  async getAll(query: IPaginationQuery, userId: string) {
  const { page, limit, skip, sortBy, sortOrder } =
    PaginationUtil.getPaginationParams(query);

  const where: any = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.status) {
    where.status = query.status;
  }

  // Example: scope companies by userId (if needed)
  where.userId = userId;

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        logo: true,
        primaryColor: true,
        secondaryColor: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            branches: true,
            customers: true,
          },
        },
      },
    }),
    prisma.company.count({ where }),
  ]);

  return PaginationUtil.formatPaginationResult(companies, total, page, limit);
}

  async getById(id: string) {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            branches: true,
            customers: true,
            susuPlans: true,
            collections: true,
          },
        },
      },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    return company;
  }

  async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      primaryColor?: string;
      secondaryColor?: string;
    },
    userId: string
  ) {
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    const updated = await prisma.company.update({
      where: { id },
      data,
    });

    await AuditLogUtil.log({
      companyId: id,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'COMPANY',
      entityId: id,
      changes: data,
    });

    return updated;
  }

  async uploadLogo(
    id: string,
    file: Buffer,
    userId: string
  ) {
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    // Delete old logo if exists
    if (company.logo) {
      const publicId = FileUploadUtil.extractPublicId(company.logo);
      await FileUploadUtil.deleteImage(publicId);
    }

    // Upload new logo
    const { url } = await FileUploadUtil.uploadImage(file, `companies/${id}`);

    const updated = await prisma.company.update({
      where: { id },
      data: { logo: url },
    });

    await AuditLogUtil.log({
      companyId: id,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'COMPANY',
      entityId: id,
      changes: { logo: url },
    });

    return updated;
  }

  async deleteLogo(id: string, userId: string) {
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    if (company.logo) {
      const publicId = FileUploadUtil.extractPublicId(company.logo);
      await FileUploadUtil.deleteImage(publicId);
    }

    const updated = await prisma.company.update({
      where: { id },
      data: { logo: null },
    });

    await AuditLogUtil.log({
      companyId: id,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'COMPANY',
      entityId: id,
      changes: { logo: null },
    });

    return updated;
  }

  async updateStatus(
    id: string,
    status: CompanyStatus,
    userId: string
  ) {
    const company = await prisma.company.update({
      where: { id },
      data: { status },
    });

    await AuditLogUtil.log({
      companyId: id,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'COMPANY',
      entityId: id,
      changes: { status },
    });

    return company;
  }

  async getStats(companyId: string) {
    const [
      totalBranches,
      totalAgents,
      totalCustomers,
      totalSusuPlans,
      activeAccounts,
      todayCollections,
    ] = await Promise.all([
      prisma.branch.count({ where: { companyId, isActive: true } }),
      prisma.user.count({ where: { companyId, role: 'AGENT', isActive: true } }),
      prisma.customer.count({ where: { companyId, isActive: true } }),
      prisma.susuPlan.count({ where: { companyId, isActive: true } }),
      prisma.susuAccount.count({ where: { customer: { companyId }, isActive: true } }),
      prisma.collection.aggregate({
        where: {
          companyId,
          collectionDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalBranches,
      totalAgents,
      totalCustomers,
      totalSusuPlans,
      activeAccounts,
      todayCollections: {
        amount: todayCollections._sum.amount || 0,
        count: todayCollections._count,
      },
    };
  }
}