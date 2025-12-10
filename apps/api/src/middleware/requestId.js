/**
 * Request ID Middleware
 * Adds a unique request ID to each request for tracing and logging
 */

import { randomUUID } from 'crypto';

export function requestIdMiddleware(req, res, next) {
  // Generate or use existing request ID
  req.id = req.headers['x-request-id'] || randomUUID();
  
  // Add to response headers for tracing
  res.setHeader('X-Request-ID', req.id);
  
  next();
}

