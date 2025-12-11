import rateLimit from 'express-rate-limit';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * General API Rate Limiter
 * Limits each IP to 100 requests per 15 minutes (production)
 * Much higher limit in development for testing
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // Much higher limit in development
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for localhost in development
    return isDevelopment && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
  },
});

/**
 * Strict Rate Limiter for Config Updates
 * Limits each IP to 10 requests per 15 minutes (production)
 * Much higher limit in development for testing
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 10, // Much higher limit in development
  message: {
    error: 'Too many requests',
    message: 'Too many config update requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development
    return isDevelopment && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
  },
});

/**
 * Lead Submission Rate Limiter
 * Limits each IP to 50 lead submissions per 15 minutes
 */
export const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit lead submissions
  message: {
    error: 'Too many requests',
    message: 'Too many lead submissions, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

