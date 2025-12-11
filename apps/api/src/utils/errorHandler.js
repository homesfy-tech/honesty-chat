/**
 * Centralized Error Handling Utilities
 * Provides consistent error responses and logging
 */

/**
 * Format error response for API
 */
export function formatErrorResponse(error, req) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Don't expose internal errors in production
  const message = isDevelopment 
    ? error.message 
    : error.statusCode < 500 
      ? error.message 
      : 'Internal server error';

  const response = {
    error: message,
    status: 'error',
    timestamp: new Date().toISOString(),
  };

  // Include stack trace in development
  if (isDevelopment && error.stack) {
    response.stack = error.stack;
  }

  // Include request ID if available (for tracing)
  if (req.id) {
    response.requestId = req.id;
  }

  return response;
}

/**
 * Log error with context
 */
export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
  };

  // In production, you might want to send to a logging service
  if (process.env.NODE_ENV === 'production') {
    console.error('Error:', JSON.stringify(errorInfo));
  } else {
    console.error('Error:', errorInfo);
  }
}

/**
 * Create standardized error
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

