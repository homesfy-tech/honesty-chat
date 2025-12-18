/**
 * Secure Logging Utility
 * Prevents sensitive data exposure in production
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

/**
 * Safe logger that only logs in development
 */
export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args) => {
    // Always log errors, but sanitize in production
    if (isProduction) {
      // In production, only log error messages, not full objects
      const sanitized = args.map(arg => {
        if (arg instanceof Error) {
          return {
            message: arg.message,
            name: arg.name,
            // Don't include stack trace in production logs
          };
        }
        if (typeof arg === 'object') {
          // Remove sensitive fields
          const sensitiveFields = [
            'password', 'token', 'apiKey', 'authorization', 'creditCard', 'ssn',
            'phone', 'phoneNumber', 'number', 'mobile', 'telephone',
            'name', 'userName', 'fullName', 'firstName', 'lastName',
            'email', 'emailAddress',
            'conversation', 'messages', 'chat', 'payload', 'metadata'
          ];
          const safe = { ...arg };
          sensitiveFields.forEach(field => {
            if (safe[field]) {
              safe[field] = '***REDACTED***';
            }
          });
          return safe;
        }
        return arg;
      });
      console.error(...sanitized);
    } else {
      console.error(...args);
    }
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

/**
 * Log API request (sanitized)
 */
export function logRequest(req, message = 'API Request') {
  if (isDevelopment) {
    logger.log(message, {
      method: req.method,
      path: req.path,
      query: req.query,
      body: sanitizeRequestBody(req.body),
      ip: req.ip,
    });
  }
}

/**
 * Sanitize request body for logging
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password', 'token', 'apiKey', 'authorization', 'creditCard', 'ssn',
    'phone', 'phoneNumber', 'number', 'mobile', 'telephone',
    'name', 'userName', 'fullName', 'firstName', 'lastName',
    'email', 'emailAddress',
    'conversation', 'messages', 'chat', 'payload', 'metadata'
  ];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  // Recursively sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeRequestBody(sanitized[key]);
    } else if (Array.isArray(sanitized[key])) {
      // Sanitize array items if they're objects
      sanitized[key] = sanitized[key].map(item => 
        typeof item === 'object' && item !== null ? sanitizeRequestBody(item) : item
      );
    }
  });
  
  return sanitized;
}

