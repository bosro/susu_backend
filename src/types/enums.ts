// src/types/enums.ts
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  AGENT = 'AGENT',
}

export enum CompanyStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export enum SusuPlanType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  TARGET_SAVINGS = 'TARGET_SAVINGS',
  DURATION_BASED = 'DURATION_BASED',
}

export enum CollectionStatus {
  PENDING = 'PENDING',
  COLLECTED = 'COLLECTED',
  MISSED = 'MISSED',
  PARTIAL = 'PARTIAL',
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER = 'TRANSFER',
  FEE = 'FEE',
}

export enum NotificationType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
}