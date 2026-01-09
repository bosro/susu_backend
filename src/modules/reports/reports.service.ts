// src/modules/reports/reports.service.ts
import { prisma } from '../../config/database';
import { CollectionStatus,  } from '../../types/enums';

export class ReportsService {
  async getCollectionReport(
    companyId: string,
    filters: {
      startDate: Date;
      endDate: Date;
      branchId?: string;
      agentId?: string;
      customerId?: string;
    }
  ) {
    const where: any = {
      companyId,
      collectionDate: {
        gte: filters.startDate,
        lte: filters.endDate,
      },
    };

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters.agentId) {
      where.agentId = filters.agentId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    const [collections, summary] = await Promise.all([
      prisma.collection.findMany({
        where,
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          agent: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          branch: {
            select: {
              name: true,
            },
          },
          susuAccount: {
            select: {
              accountNumber: true,
              susuPlan: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          collectionDate: 'asc',
        },
      }),
      prisma.collection.aggregate({
        where,
        _sum: {
          amount: true,
          expectedAmount: true,
        },
        _count: true,
      }),
    ]);

    const groupedByStatus = await prisma.collection.groupBy({
      by: ['status'],
      where,
      _sum: {
        amount: true,
      },
      _count: true,
    });

    return {
      collections,
      summary: {
        totalAmount: summary._sum.amount || 0,
        totalExpected: summary._sum.expectedAmount || 0,
        totalCount: summary._count,
        byStatus: groupedByStatus,
      },
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    };
  }

  async getAgentPerformanceReport(
    companyId: string,
    filters: {
      startDate: Date;
      endDate: Date;
      branchId?: string;
    }
  ) {
    const where: any = {
      companyId,
      collectionDate: {
        gte: filters.startDate,
        lte: filters.endDate,
      },
    };

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    const agentPerformance = await prisma.collection.groupBy({
      by: ['agentId'],
      where,
      _sum: {
        amount: true,
        expectedAmount: true,
      },
      _count: true,
    });

    const agentsWithDetails = await Promise.all(
      agentPerformance.map(async (performance) => {
        const agent = await prisma.user.findUnique({
          where: { id: performance.agentId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            branch: {
              select: {
                name: true,
              },
            },
          },
        });

        const missedCount = await prisma.collection.count({
          where: {
            ...where,
            agentId: performance.agentId,
            status: CollectionStatus.MISSED,
          },
        });

        const uniqueCustomers = await prisma.collection.findMany({
          where: {
            ...where,
            agentId: performance.agentId,
          },
          distinct: ['customerId'],
          select: {
            customerId: true,
          },
        });

        return {
          agent,
          totalCollected: performance._sum.amount || 0,
          totalExpected: performance._sum.expectedAmount || 0,
          totalCollections: performance._count,
          missedCollections: missedCount,
          uniqueCustomers: uniqueCustomers.length,
          collectionRate:
            performance._sum.expectedAmount && Number(performance._sum.expectedAmount) > 0
              ? ((Number(performance._sum.amount) / Number(performance._sum.expectedAmount)) * 100).toFixed(2)
              : 0,
        };
      })
    );

    return {
      agents: agentsWithDetails.sort(
        (a, b) => Number(b.totalCollected) - Number(a.totalCollected)
      ),
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    };
  }

  async getCustomerReport(
    companyId: string,
    filters: {
      startDate: Date;
      endDate: Date;
      branchId?: string;
      customerId?: string;
    }
  ) {
    const where: any = {
      companyId,
      collections: {
        some: {
          collectionDate: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        },
      },
    };

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters.customerId) {
      where.id = filters.customerId;
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        branch: {
          select: {
            name: true,
          },
        },
        susuAccounts: {
          where: { isActive: true },
          include: {
            susuPlan: {
              select: {
                name: true,
                type: true,
              },
            },
          },
        },
        _count: {
          select: {
            collections: {
              where: {
                collectionDate: {
                  gte: filters.startDate,
                  lte: filters.endDate,
                },
              },
            },
          },
        },
      },
    });

    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const collections = await prisma.collection.aggregate({
          where: {
            customerId: customer.id,
            collectionDate: {
              gte: filters.startDate,
              lte: filters.endDate,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const missedCount = await prisma.collection.count({
          where: {
            customerId: customer.id,
            collectionDate: {
              gte: filters.startDate,
              lte: filters.endDate,
            },
            status: CollectionStatus.MISSED,
          },
        });

        return {
          customer: {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            branch: customer.branch,
          },
          totalCollected: collections._sum.amount || 0,
          totalCollections: customer._count.collections,
          missedCollections: missedCount,
          activeAccounts: customer.susuAccounts.length,
          totalBalance: customer.susuAccounts.reduce(
            (sum, acc) => sum + Number(acc.balance),
            0
          ),
        };
      })
    );

    return {
      customers: customersWithStats,
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    };
  }

  async getBranchReport(
    companyId: string,
    filters: {
      startDate: Date;
      endDate: Date;
    }
  ) {
    const branches = await prisma.branch.findMany({
      where: { companyId, isActive: true },
      include: {
        _count: {
          select: {
            agents: { where: { isActive: true } },
            customers: { where: { isActive: true } },
          },
        },
      },
    });

    const branchesWithStats = await Promise.all(
      branches.map(async (branch) => {
        const collections = await prisma.collection.aggregate({
          where: {
            branchId: branch.id,
            collectionDate: {
              gte: filters.startDate,
              lte: filters.endDate,
            },
          },
          _sum: {
            amount: true,
            expectedAmount: true,
          },
          _count: true,
        });

        const missedCount = await prisma.collection.count({
          where: {
            branchId: branch.id,
            collectionDate: {
              gte: filters.startDate,
              lte: filters.endDate,
            },
            status: CollectionStatus.MISSED,
          },
        });

        return {
          branch: {
            id: branch.id,
            name: branch.name,
            address: branch.address,
          },
          totalAgents: branch._count.agents,
          totalCustomers: branch._count.customers,
          totalCollected: collections._sum.amount || 0,
          totalExpected: collections._sum.expectedAmount || 0,
          totalCollections: collections._count,
          missedCollections: missedCount,
          collectionRate:
            collections._sum.expectedAmount && Number(collections._sum.expectedAmount) > 0
              ? ((Number(collections._sum.amount) / Number(collections._sum.expectedAmount)) * 100).toFixed(2)
              : 0,
        };
      })
    );

    return {
      branches: branchesWithStats.sort(
        (a, b) => Number(b.totalCollected) - Number(a.totalCollected)
      ),
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    };
  }

  async getFinancialSummary(
    companyId: string,
    filters: {
      startDate: Date;
      endDate: Date;
      branchId?: string;
    }
  ) {
    const where: any = {
      companyId,
      collectionDate: {
        gte: filters.startDate,
        lte: filters.endDate,
      },
    };

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    const [collections, withdrawals, totalBalance] = await Promise.all([
      prisma.collection.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: {
          type: 'WITHDRAWAL',
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
          susuAccount: {
            customer: { companyId },
          },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.susuAccount.aggregate({
        where: {
          customer: { companyId },
          isActive: true,
        },
        _sum: { balance: true },
      }),
    ]);

    const dailyCollections = await prisma.collection.groupBy({
      by: ['collectionDate'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: {
        collectionDate: 'asc',
      },
    });

    return {
      summary: {
        totalCollections: collections._sum.amount || 0,
        collectionsCount: collections._count,
        totalWithdrawals: withdrawals._sum.amount || 0,
        withdrawalsCount: withdrawals._count,
        currentBalance: totalBalance._sum.balance || 0,
        netFlow: Number(collections._sum.amount || 0) - Number(withdrawals._sum.amount || 0),
      },
      dailyBreakdown: dailyCollections.map((day) => ({
        date: day.collectionDate,
        amount: day._sum.amount || 0,
        count: day._count,
      })),
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    };
  }
}