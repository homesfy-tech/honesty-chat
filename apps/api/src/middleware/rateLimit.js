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
  max: isDevelopment ? 10000 : 100, // Much higher limit in development (10000 requests per 15 min)
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for localhost in development
    // Also check for proxy headers (Vite proxy, etc.)
    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
    const isLocalhost = ip === '127.0.0.1' || 
                        ip === '::1' || 
                        ip === '::ffff:127.0.0.1' ||
                        ip?.startsWith('127.') ||
                        ip?.startsWith('::ffff:127.');
    const isProxyLocalhost = req.headers['x-forwarded-for']?.includes('127.0.0.1') ||
                            req.headers['x-real-ip'] === '127.0.0.1';
    return isDevelopment && (isLocalhost || isProxyLocalhost);
  },
});

/**
 * Strict Rate Limiter for Config Updates
 * Limits each IP to 10 requests per 15 minutes (production)
 * Much higher limit in development for testing
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 10, // Much higher limit in development (1000 requests per 15 min)
  message: {
    error: 'Too many requests',
    message: 'Too many config update requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development
    // Also check for proxy headers (Vite proxy, etc.)
    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
    const isLocalhost = ip === '127.0.0.1' || 
                        ip === '::1' || 
                        ip === '::ffff:127.0.0.1' ||
                        ip?.startsWith('127.') ||
                        ip?.startsWith('::ffff:127.');
    const isProxyLocalhost = req.headers['x-forwarded-for']?.includes('127.0.0.1') ||
                            req.headers['x-real-ip'] === '127.0.0.1';
    return isDevelopment && (isLocalhost || isProxyLocalhost);
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

