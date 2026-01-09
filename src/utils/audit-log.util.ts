// src/utils/audit-log.util.ts
import { prisma } from '../config/database';
import { AuditAction } from '../types/enums';

interface IAuditLogData {
  companyId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogUtil {
  static async log(data: IAuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          companyId: data.companyId,
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          changes: data.changes,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      console.error('Audit log error:', error);
      // Don't throw - audit logging shouldn't break the main flow
    }
  }
}