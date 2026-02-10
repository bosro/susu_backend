// src/middleware/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';
import { config } from '../config';

// ✅ General API rate limiter - VERY lenient for normal operation
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // 2000 requests per 15 minutes - very generous
  message: {
    error: 'Rate limit exceeded',
    message: 'You have made too many requests. Please wait a few minutes before trying again.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'You have made too many requests. Please wait 15 minutes before trying again.',
      retryAfter: '15 minutes',
      hint: 'This limit protects our service. Normal usage should not trigger this.'
    });
  },
});

// ✅ Auth rate limiter - for login/register only
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts per 15 minutes
  skipSuccessfulRequests: true, // Only count failed attempts
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts',
      message: 'You have made too many login attempts. Please wait 15 minutes before trying again.',
      retryAfter: '15 minutes',
      hint: 'If you forgot your password, use the password reset option.'
    });
  },
});

// ✅ Token refresh limiter - very lenient for automatic operations
export const tokenRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Very high limit - token refresh is automatic and frequent
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Token refresh limit exceeded',
      message: 'Too many token refresh requests. Please wait a moment and try again.',
      retryAfter: '15 minutes',
      hint: 'Try logging out and logging back in if this persists.'
    });
  },
});

// ✅ Password reset limiter - prevent abuse while being reasonable
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 password reset requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many password reset attempts',
      message: 'You have requested too many password resets. Please wait 1 hour before trying again.',
      retryAfter: '1 hour',
      hint: 'Check your email spam folder or contact support if you need help.'
    });
  },
});

// ✅ Collection operations limiter - lenient for field agents
export const collectionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // High limit for agents doing collections in the field
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Collection rate limit exceeded',
      message: 'You have performed too many collection operations. Please wait a few minutes.',
      retryAfter: '15 minutes',
      hint: 'This limit ensures data integrity. Normal collection work should not trigger this.'
    });
  },
});

// ✅ Read operations limiter - very lenient for browsing/viewing
export const readOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // Very high limit for GET requests
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'You have made too many requests. Please wait a moment and try again.',
      retryAfter: '15 minutes'
    });
  },
});