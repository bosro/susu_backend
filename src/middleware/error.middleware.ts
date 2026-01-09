import { Request, Response, NextFunction } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { ResponseUtil } from "../utils/response.util";
import { logger } from "../utils/logger.util";

export class ErrorMiddleware {
  static handle(
    error: any,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void {
    logger.error("Error:", error);

    // Prisma errors
    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          ResponseUtil.conflict(
            res,
            `Duplicate entry: ${error.meta?.target || "field"} already exists`
          );
          return;

        case "P2025":
          ResponseUtil.notFound(res, "Record not found");
          return;

        case "P2003":
          ResponseUtil.badRequest(res, "Foreign key constraint failed");
          return;
      }
    }

    // Validation errors
    if (error.name === "ValidationError") {
      ResponseUtil.badRequest(res, error.message);
      return;
    }

    // JWT errors
    if (error.name === "JsonWebTokenError") {
      ResponseUtil.unauthorized(res, "Invalid token");
      return;
    }

    if (error.name === "TokenExpiredError") {
      ResponseUtil.unauthorized(res, "Token expired");
      return;
    }

    // Multer errors
    if (error.name === "MulterError") {
      if (error.code === "LIMIT_FILE_SIZE") {
        ResponseUtil.badRequest(res, "File size exceeds limit");
        return;
      }
      ResponseUtil.badRequest(res, error.message);
      return;
    }

    // Default error
    ResponseUtil.error(
      res,
      error.message || "Internal server error",
      error.statusCode || 500
    );
  }

  static notFound(req: Request, res: Response): void {
    ResponseUtil.notFound(res, `Route ${req.originalUrl} not found`);
  }
}
