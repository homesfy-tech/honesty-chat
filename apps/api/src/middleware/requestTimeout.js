/**
 * Request Timeout Middleware
 * Prevents long-running requests from consuming resources
 */

const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

export function requestTimeout(req, res, next) {
  // Set timeout
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request timeout',
        message: 'The request took too long to process',
        status: 'error',
      });
    }
  }, REQUEST_TIMEOUT_MS);

  // Clear timeout when response is sent
  const originalEnd = res.end;
  res.end = function(...args) {
    clearTimeout(timeout);
    originalEnd.apply(this, args);
  };

  next();
}

