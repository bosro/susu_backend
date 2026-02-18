
// src/modules/subscriptions/subscriptions.service.ts
import { prisma } from '../../config/database';
import { AuditLogUtil } from '../../utils/audit-log.util';
import { EmailService } from '../../services/email.service';
import { AuditAction, CompanyStatus } from '../../types/enums';
import { PaginationUtil } from '../../utils/pagination.util';
import { IPaginationQuery } from '../../types/interfaces';

export enum SubscriptionPlan {
  TRIAL = 'TRIAL',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

// Maps plan to number of days
const PLAN_DURATION_DAYS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.TRIAL]: 14,
  [SubscriptionPlan.MONTHLY]: 30,
  [SubscriptionPlan.QUARTERLY]: 90,
  [SubscriptionPlan.YEARLY]: 365,
};

export class SubscriptionsService {

  // ─── ACTIVATE / CREATE SUBSCRIPTION ─────────────────────────────────────────

  async activateSubscription(
    companyId: string,
    data: {
      plan: SubscriptionPlan;
      amount?: number;
      notes?: string;
      startDate?: Date;
    },
    activatedBy: string
  ) {
    // Validate company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: {
          where: { role: 'COMPANY_ADMIN', isActive: true },
          select: { email: true, firstName: true, lastName: true },
          take: 1,
        },
      },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    const startDate = data.startDate || new Date();
    const durationDays = PLAN_DURATION_DAYS[data.plan];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);

    // Expire any existing active subscription for this company
    await prisma.companySubscription.updateMany({
      where: {
        companyId,
        status: { in: ['ACTIVE', 'PENDING'] as any },
      },
      data: { status: 'CANCELLED' as any },
    });

    // Create new subscription
    const subscription = await prisma.companySubscription.create({
      data: {
        companyId,
        plan: data.plan as any,
        status: 'ACTIVE' as any,
        startDate,
        endDate,
        amount: data.amount,
        notes: data.notes,
        createdBy: activatedBy,
      },
      include: {
        company: { select: { id: true, name: true, email: true, status: true } },
      },
    });

    // ✅ Activate the company if it was pending/suspended
    if (company.status !== CompanyStatus.ACTIVE) {
      await prisma.company.update({
        where: { id: companyId },
        data: { status: CompanyStatus.ACTIVE },
      });
      console.log(`✅ Company ${company.name} status changed to ACTIVE`);

      // Notify company admin of reactivation
      if (company.users[0]) {
        const adminUser = company.users[0];
        EmailService.sendAccountReactivatedEmail(adminUser.email, {
          adminName: `${adminUser.firstName} ${adminUser.lastName}`,
          companyName: company.name,
          plan: data.plan,
          expiryDate: endDate,
          loginUrl: `${process.env.FRONTEND_URL}/login`,
        }).catch(err => console.error('⚠️ Failed to send reactivation email:', err));
      }
    }

    await AuditLogUtil.log({
      companyId,
      userId: activatedBy,
      action: AuditAction.CREATE,
      entityType: 'SUBSCRIPTION',
      entityId: subscription.id,
      changes: {
        plan: data.plan,
        startDate,
        endDate,
        amount: data.amount,
      },
    });

    console.log(`✅ Subscription activated for ${company.name}: ${data.plan} until ${endDate.toDateString()}`);
    return subscription;
  }

  // ─── SUSPEND COMPANY ─────────────────────────────────────────────────────────

  async suspendCompany(
    companyId: string,
    reason: string,
    suspendedBy: string
  ) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: {
          where: { role: 'COMPANY_ADMIN', isActive: true },
          select: { email: true, firstName: true, lastName: true },
          take: 1,
        },
      },
    });

    if (!company) throw new Error('Company not found');

    // Update company status
    await prisma.company.update({
      where: { id: companyId },
      data: { status: CompanyStatus.SUSPENDED },
    });

    // Mark active subscription as suspended
    await prisma.companySubscription.updateMany({
      where: { companyId, status: 'ACTIVE' as any },
      data: { status: 'SUSPENDED' as any, notes: reason },
    });

    // Invalidate all refresh tokens for this company's users (force re-login check)
    const companyUserIds = await prisma.user.findMany({
      where: { companyId },
      select: { id: true },
    });

    if (companyUserIds.length > 0) {
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: companyUserIds.map(u => u.id) } },
      });
      console.log(`✅ Invalidated tokens for ${companyUserIds.length} users of suspended company`);
    }

    // Notify company admin
    if (company.users[0]) {
      const adminUser = company.users[0];
      EmailService.sendAccountSuspendedEmail(adminUser.email, {
        adminName: `${adminUser.firstName} ${adminUser.lastName}`,
        companyName: company.name,
        reason,
        contactEmail: process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || 'support@system.com',
      }).catch(err => console.error('⚠️ Failed to send suspension email:', err));
    }

    await AuditLogUtil.log({
      companyId,
      userId: suspendedBy,
      action: AuditAction.UPDATE,
      entityType: 'COMPANY',
      entityId: companyId,
      changes: { status: 'SUSPENDED', reason },
    });

    console.log(`⛔ Company ${company.name} suspended. Reason: ${reason}`);
    return { message: 'Company suspended successfully', companyId, reason };
  }

  // ─── REACTIVATE COMPANY ───────────────────────────────────────────────────────

  async reactivateCompany(
    companyId: string,
    reactivatedBy: string
  ) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) throw new Error('Company not found');

    // Check if there's an active valid subscription
    const activeSubscription = await prisma.companySubscription.findFirst({
      where: {
        companyId,
        status: { in: ['ACTIVE', 'SUSPENDED'] as any },
        endDate: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeSubscription) {
      throw new Error(
        'Cannot reactivate: no valid subscription found. Please activate a new subscription first.'
      );
    }

    await prisma.company.update({
      where: { id: companyId },
      data: { status: CompanyStatus.ACTIVE },
    });

    await prisma.companySubscription.update({
      where: { id: activeSubscription.id },
      data: { status: 'ACTIVE' as any },
    });

    await AuditLogUtil.log({
      companyId,
      userId: reactivatedBy,
      action: AuditAction.UPDATE,
      entityType: 'COMPANY',
      entityId: companyId,
      changes: { status: 'ACTIVE' },
    });

    console.log(`✅ Company ${company.name} reactivated`);
    return { message: 'Company reactivated successfully' };
  }

  // ─── CANCEL SUBSCRIPTION ─────────────────────────────────────────────────────

  async cancelSubscription(
    subscriptionId: string,
    reason: string,
    cancelledBy: string
  ) {
    const subscription = await prisma.companySubscription.findUnique({
      where: { id: subscriptionId },
      include: { company: { select: { id: true, name: true } } },
    });

    if (!subscription) throw new Error('Subscription not found');

    await prisma.companySubscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELLED' as any, notes: reason },
    });

    await AuditLogUtil.log({
      companyId: subscription.companyId,
      userId: cancelledBy,
      action: AuditAction.UPDATE,
      entityType: 'SUBSCRIPTION',
      entityId: subscriptionId,
      changes: { status: 'CANCELLED', reason },
    });

    return { message: 'Subscription cancelled' };
  }

  // ─── GET SUBSCRIPTION FOR COMPANY ────────────────────────────────────────────

  async getCompanySubscription(companyId: string) {
    const subscriptions = await prisma.companySubscription.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        company: { select: { id: true, name: true, status: true } },
      },
    });

    const active = subscriptions.find(s => s.status === 'ACTIVE');
    const daysLeft = active?.endDate
      ? Math.max(0, Math.ceil((new Date(active.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      active,
      daysLeft,
      history: subscriptions,
      isExpiringSoon: daysLeft > 0 && daysLeft <= 7,
      isExpired: !active || (active.endDate ? new Date(active.endDate) < new Date() : false),
    };
  }

  // ─── GET ALL SUBSCRIPTIONS (paginated, for super admin) ───────────────────────

  async getAll(query: IPaginationQuery & {
    status?: string;
    plan?: string;
    expiringSoon?: boolean;
  }) {
    const { page, limit, skip, sortBy, sortOrder } =
      PaginationUtil.getPaginationParams(query);

    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.plan) where.plan = query.plan;

    if (query.expiringSoon) {
      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      where.status = 'ACTIVE';
      where.endDate = { lte: in7Days, gte: new Date() };
    }

    const [subscriptions, total] = await Promise.all([
      prisma.companySubscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
            },
          },
        },
      }),
      prisma.companySubscription.count({ where }),
    ]);

    // Annotate with daysLeft
    const annotated = subscriptions.map(sub => ({
      ...sub,
      daysLeft: sub.endDate
        ? Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null,
    }));

    return PaginationUtil.formatPaginationResult(annotated, total, page, limit);
  }

  // ─── CHECK AND EXPIRE SUBSCRIPTIONS (call from cron or manual trigger) ───────

  async checkAndExpireSubscriptions(triggeredBy: string) {
    console.log('🔄 Running subscription expiry check...');

    // Find all active subscriptions that have expired
    const expiredSubscriptions = await prisma.companySubscription.findMany({
      where: {
        status: 'ACTIVE' as any,
        endDate: { lt: new Date() },
      },
      include: {
        company: {
          include: {
            users: {
              where: { role: 'COMPANY_ADMIN', isActive: true },
              select: { email: true, firstName: true, lastName: true },
              take: 1,
            },
          },
        },
      },
    });

    console.log(`⚠️ Found ${expiredSubscriptions.length} expired subscription(s)`);

    const results = await Promise.allSettled(
      expiredSubscriptions.map(async (sub) => {
        // Mark subscription as expired
        await prisma.companySubscription.update({
          where: { id: sub.id },
          data: { status: 'EXPIRED' as any },
        });

        // Suspend the company
        await prisma.company.update({
          where: { id: sub.companyId },
          data: { status: CompanyStatus.SUSPENDED },
        });

        // Invalidate all refresh tokens
        const userIds = await prisma.user.findMany({
          where: { companyId: sub.companyId },
          select: { id: true },
        });
        if (userIds.length > 0) {
          await prisma.refreshToken.deleteMany({
            where: { userId: { in: userIds.map(u => u.id) } },
          });
        }

        // Notify company admin
        if (sub.company.users[0]) {
          const admin = sub.company.users[0];
          await EmailService.sendAccountSuspendedEmail(admin.email, {
            adminName: `${admin.firstName} ${admin.lastName}`,
            companyName: sub.company.name,
            reason: `Your ${sub.plan} subscription expired on ${new Date(sub.endDate!).toDateString()}.`,
            contactEmail: process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || 'support@system.com',
          });
        }

        await AuditLogUtil.log({
          companyId: sub.companyId,
          userId: triggeredBy,
          action: AuditAction.UPDATE,
          entityType: 'SUBSCRIPTION',
          entityId: sub.id,
          changes: { status: 'EXPIRED', autoExpired: true },
        });

        console.log(`⛔ Auto-expired: ${sub.company.name} (${sub.plan})`);
        return sub.company.name;
      })
    );

    // Find subscriptions expiring in 1, 3, 7 days and send warnings
    await this.sendExpiryWarnings();

    const expired = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      processed: expiredSubscriptions.length,
      expired,
      failed,
      message: `Expiry check complete. ${expired} subscription(s) expired, ${failed} failed.`,
    };
  }

  // ─── SEND EXPIRY WARNING EMAILS ───────────────────────────────────────────────

  private async sendExpiryWarnings() {
    const warningDays = [1, 3, 7];

    for (const days of warningDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const dayStart = new Date(targetDate.setHours(0, 0, 0, 0));
      const dayEnd = new Date(targetDate.setHours(23, 59, 59, 999));

      const expiringSubs = await prisma.companySubscription.findMany({
        where: {
          status: 'ACTIVE' as any,
          endDate: { gte: dayStart, lte: dayEnd },
        },
        include: {
          company: {
            include: {
              users: {
                where: { role: 'COMPANY_ADMIN', isActive: true },
                select: { email: true, firstName: true, lastName: true },
                take: 1,
              },
            },
          },
        },
      });

      for (const sub of expiringSubs) {
        if (sub.company.users[0]) {
          const admin = sub.company.users[0];
          await EmailService.sendSubscriptionExpiryWarning(admin.email, {
            adminName: `${admin.firstName} ${admin.lastName}`,
            companyName: sub.company.name,
            plan: sub.plan,
            expiryDate: sub.endDate!,
            daysLeft: days,
            renewUrl: `${process.env.FRONTEND_URL}/features/settings`,
          }).catch(err => console.error('Failed to send warning:', err));
        }
      }
    }
  }

  // ─── GET DASHBOARD STATS (super admin overview) ───────────────────────────────

  async getSubscriptionStats() {
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const [
      totalCompanies,
      activeSubscriptions,
      expiredSubscriptions,
      suspendedCompanies,
      pendingCompanies,
      expiringSoon,
      trialSubscriptions,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.companySubscription.count({ where: { status: 'ACTIVE' as any } }),
      prisma.companySubscription.count({ where: { status: 'EXPIRED' as any } }),
      prisma.company.count({ where: { status: CompanyStatus.SUSPENDED } }),
      prisma.company.count({ where: { status: CompanyStatus.PENDING } }),
      prisma.companySubscription.count({
        where: {
          status: 'ACTIVE' as any,
          endDate: { lte: in7Days, gte: now },
        },
      }),
      prisma.companySubscription.count({
        where: { plan: 'TRIAL' as any, status: 'ACTIVE' as any },
      }),
    ]);

    // Revenue by plan (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueByPlan = await prisma.companySubscription.groupBy({
      by: ['plan'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { not: 'CANCELLED' as any },
      },
      _sum: { amount: true },
      _count: true,
    });

    return {
      totalCompanies,
      activeSubscriptions,
      expiredSubscriptions,
      suspendedCompanies,
      pendingCompanies,
      expiringSoon,
      trialSubscriptions,
      revenueByPlan,
    };
  }
}