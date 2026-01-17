// src/modules/companies/companies.controller.ts
import { Response, NextFunction } from "express";
import { CompaniesService } from "./companies.service";
import { ResponseUtil } from "../../utils/response.util";
import { IAuthRequest, IUser } from "../../types/interfaces";

function requireUser(req: IAuthRequest): IUser {
  if (!req.user) {
    throw new Error("User not authenticated");
  }
  return req.user;
}


export class CompaniesController {
  private companiesService: CompaniesService;

  constructor() {
    this.companiesService = new CompaniesService();
  }

  getAll = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = requireUser(req);
    const result = await this.companiesService.getAll(req.query, user.id);
      ResponseUtil.success(res, result, "Companies retrieved successfully");
    } catch (error: any) {
      next(error);
    }
  };

  getById = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const company = await this.companiesService.getById(req.params.id);
      ResponseUtil.success(res, company, "Company retrieved successfully");
    } catch (error: any) {
      next(error);
    }
  };

  update = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
        const user = requireUser(req);
      const company = await this.companiesService.update(
        req.params.id,
        req.body,
        user.id
      );
      ResponseUtil.success(res, company, "Company updated successfully");
    } catch (error: any) {
      next(error);
    }
  };

  uploadLogo = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.file) {
        ResponseUtil.badRequest(res, "No file uploaded");
        return;
      }
      const user = requireUser(req);
      const company = await this.companiesService.uploadLogo(
        req.params.id,
        req.file.buffer,
        user.id
      );
      ResponseUtil.success(res, company, "Logo uploaded successfully");
    } catch (error: any) {
      next(error);
    }
  };

  deleteLogo = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = requireUser(req);
      const company = await this.companiesService.deleteLogo(
        req.params.id,
        user.id
      );
      ResponseUtil.success(res, company, "Logo deleted successfully");
    } catch (error: any) {
      next(error);
    }
  };

  updateStatus = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = requireUser(req);
      const company = await this.companiesService.updateStatus(
        req.params.id,
        req.body.status,
        user.id
      );
      ResponseUtil.success(res, company, "Company status updated successfully");
    } catch (error: any) {
      next(error);
    }
  };

  getStats = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await this.companiesService.getStats(req.params.id);
      ResponseUtil.success(res, stats, "Company stats retrieved successfully");
    } catch (error: any) {
      next(error);
    }
  };
}


