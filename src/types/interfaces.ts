// src/types/interfaces.ts
import { Request } from 'express';
import { UserRole } from './enums';

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string | null;
  branchId: string | null;
}

export interface IAuthRequest extends Request {
  user?: IUser;
  companyId?: string; // ✅ For easy access in controllers
  branchId?: string; // ✅ For easy access in controllers
}

export interface ITokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  branchId: string | null;
}

export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  role?: string;
  branchId?: string;
  isActive?: boolean;
  type?: string;
  customerId?: string;
  susuPlanId?: string;
  isRead?: boolean;
  isLocked?: boolean;
  agentId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  companyId?: string; // ✅ Added for filtering
}

export interface IPaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ICollectionStats {
  totalExpected: number;
  totalCollected: number;
  totalMissed: number;
  collectionRate: number;
  totalCustomers: number;
}

export interface IReportFilter {
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
  agentId?: string;
  customerId?: string;
}

export interface IFileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

// ✅ Additional useful interfaces

export interface ICompanyContext {
  companyId: string;
  companyName?: string;
  companyStatus?: string;
}

export interface IBranchContext {
  branchId: string;
  branchName?: string;
}

export interface IUserContext {
  userId: string;
  role: UserRole;
  permissions?: string[];
}

// ✅ Request with full context
export interface IContextualRequest extends IAuthRequest {
  companyContext?: ICompanyContext;
  branchContext?: IBranchContext;
  userContext?: IUserContext;
}