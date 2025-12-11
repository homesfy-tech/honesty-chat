import { logger } from '../utils/logger.js';

const requestStats = {
  totalRequests: 0,
  errors: 0,
  slowRequests: 0, // Requests taking > 1 second
  suspiciousPatterns: [],
  lastReset: Date.now(),
};

setInterval(() => {
  requestStats.totalRequests = 0;
  requestStats.errors = 0;
  requestStats.slowRequests = 0;
  requestStats.suspiciousPatterns = [];
  requestStats.lastReset = Date.now();
}, 60 * 60 * 1000);

export function monitoringMiddleware(req, res, next) {
  const startTime = Date.now();
  const requestId = req.id || 'unknown';
  
  requestStats.totalRequests++;

  if (process.env.ENABLE_REQUEST_LOGGING === 'true' || process.env.NODE_ENV !== 'production') {
    logger.log(`📊 Request: ${req.method} ${req.path} [${requestId}]`);
  }

  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    if (duration > 1000) {
      requestStats.slowRequests++;
      logger.warn(`⚠️  Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }

    if (res.statusCode >= 400) {
      requestStats.errors++;
      if (res.statusCode >= 500) {
        logger.error(`❌ Server error: ${req.method} ${req.path} - ${res.statusCode}`);
      }
    }

    detectSuspiciousPatterns(req, res, duration);
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Detect suspicious request patterns
 */
function detectSuspiciousPatterns(req, res, duration) {
  // Large payloads
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > 500000) {
    logger.warn(`⚠️  Large payload detected: ${req.method} ${req.path} - ${req.headers['content-length']} bytes`);
  }

  // Unusual user agents
  const userAgent = req.headers['user-agent'] || '';
  if (userAgent.length > 500 || !userAgent || userAgent === '') {
    logger.warn(`⚠️  Suspicious user agent: ${req.method} ${req.path}`);
  }

  // Multiple errors from same IP (basic check)
  // In production, use Redis or external service for IP tracking
  if (res.statusCode >= 400 && process.env.NODE_ENV === 'production') {
    const ip = req.ip || req.connection.remoteAddress;
    // This is a simple check - in production, use proper rate limiting service
    logger.warn(`⚠️  Error from IP: ${ip} - ${req.method} ${req.path} - ${res.statusCode}`);
  }
}

/**
 * Get monitoring statistics
 */
export function getMonitoringStats() {
  return {
    ...requestStats,
    uptime: Date.now() - requestStats.lastReset,
    errorRate: requestStats.totalRequests > 0 
      ? (requestStats.errors / requestStats.totalRequests * 100).toFixed(2) + '%'
      : '0%',
    slowRequestRate: requestStats.totalRequests > 0
      ? (requestStats.slowRequests / requestStats.totalRequests * 100).toFixed(2) + '%'
      : '0%',
  };
}

/**
 * Health check endpoint data
 */
export function getHealthCheck() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
    },
    stats: getMonitoringStats(),
  };
}

