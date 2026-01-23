// src/middleware/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';
import { config } from '../config';

// ✅ General API rate limiter - reasonable limits for normal usage
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit?.windowMs || 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit?.max || 200, // ✅ Increased from default - 200 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // ✅ Skip for successful requests to be more lenient
  skipSuccessfulRequests: false,
});

// ✅ Auth rate limiter - separate limits for login/register only
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // ✅ Increased from 5 to 15 - allows for multiple legitimate attempts
  message: 'Too many authentication attempts, please try again in 15 minutes.',
  skipSuccessfulRequests: true, // ✅ Only count failed attempts
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ NEW: Separate rate limiter for token refresh - very lenient
export const tokenRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // ✅ High limit - token refresh is automatic and frequent
  message: 'Too many token refresh requests, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ NEW: Password reset limiter - prevent abuse
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 password reset requests per hour
  message: 'Too many password reset attempts, please try again in an hour.',
  standardHeaders: true,
  legacyHeaders: false,
});