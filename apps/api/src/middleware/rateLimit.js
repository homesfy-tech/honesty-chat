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
    // Always skip rate limiting for localhost (regardless of NODE_ENV)
    // This handles both direct connections and proxy connections (Vite proxy)
    // With trust proxy enabled, req.ip will be correctly set
    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
    const hostname = req.headers.host?.split(':')[0] || '';
    const forwardedFor = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || '';
    
    const isLocalhost = 
      ip === '127.0.0.1' || 
      ip === '::1' || 
      ip === '::ffff:127.0.0.1' ||
      ip === 'localhost' ||
      forwardedFor === '127.0.0.1' ||
      forwardedFor === '::1' ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('localhost:') ||
      hostname.startsWith('127.0.0.1:');
    
    // Always skip for localhost (even in production mode for local development)
    // This allows local testing without rate limit issues
    if (isLocalhost) {
      return true;
    }
    
    // Additional check: if IP is missing or looks like localhost, skip
    if (!ip || ip.includes('127.0.0.1') || ip.includes('localhost') || ip.includes('::1')) {
      return true;
    }
    
    return false;
  },
});

/**
 * Strict Rate Limiter for Config Updates
 * Limits each IP to 10 requests per 15 minutes (production)
 * Much higher limit in development for testing
 * Always skips for localhost to allow development/testing
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
    // Always skip rate limiting for localhost (regardless of NODE_ENV)
    // This handles both direct connections and proxy connections (Vite proxy)
    // With trust proxy enabled, req.ip will be correctly set
    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
    const hostname = req.headers.host?.split(':')[0] || '';
    const forwardedFor = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || '';
    
    const isLocalhost = 
      ip === '127.0.0.1' || 
      ip === '::1' || 
      ip === '::ffff:127.0.0.1' ||
      ip === 'localhost' ||
      forwardedFor === '127.0.0.1' ||
      forwardedFor === '::1' ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('localhost:') ||
      hostname.startsWith('127.0.0.1:');
    
    // Always skip for localhost (even in production mode for local development)
    // This allows local testing without rate limit issues
    if (isLocalhost) {
      return true;
    }
    
    // Additional check: if IP is missing or looks like localhost, skip
    if (!ip || ip.includes('127.0.0.1') || ip.includes('localhost') || ip.includes('::1')) {
      return true;
    }
    
    return false;
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

