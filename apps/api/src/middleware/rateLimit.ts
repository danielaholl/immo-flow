/**
 * Rate Limiting Middleware
 * Protects endpoints from brute force attacks
 */
import rateLimit from 'express-rate-limit';

// Check if running in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Strict rate limiter for auth endpoints (login, register)
 * Development: 50 requests per 15 minutes
 * Production: 5 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 50 : 5, // Higher limit in development
  message: {
    error: 'Too many authentication attempts, please try again after 15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for successful requests
  skipSuccessfulRequests: false,
  // Skip rate limiting for failed requests (keeps counting them)
  skipFailedRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

/**
 * General API rate limiter
 * Development: 1000 requests per 15 minutes (very lenient for hot reloading)
 * Production: 100 requests per 15 minutes per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // Much higher limit in development
  message: {
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

/**
 * Strict rate limiter for sensitive operations
 * Limits: 10 requests per hour per IP
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: 'Too many requests for this sensitive operation, please try again after an hour',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  },
});
