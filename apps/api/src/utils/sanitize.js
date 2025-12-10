/**
 * Input Sanitization Utilities
 * Prevents XSS and injection attacks
 */

/**
 * Sanitize string input - remove potentially dangerous characters
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj, maxDepth = 10, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return '[Max Depth Reached]';
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth, currentDepth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key
      const safeKey = sanitizeString(String(key));
      // Limit key length
      if (safeKey.length > 100) {
        continue; // Skip overly long keys
      }
      // Sanitize value
      sanitized[safeKey] = sanitizeObject(value, maxDepth, currentDepth + 1);
    }
    return sanitized;
  }
  
  return String(obj);
}

/**
 * Sanitize metadata object (for leads)
 */
export function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return undefined;
  }
  
  // Limit object size (prevent DoS)
  const keys = Object.keys(metadata);
  if (keys.length > 50) {
    // Too many keys, truncate
    const limited = {};
    keys.slice(0, 50).forEach(key => {
      limited[key] = metadata[key];
    });
    return sanitizeObject(limited);
  }
  
  return sanitizeObject(metadata);
}

/**
 * Sanitize conversation array
 */
export function sanitizeConversation(conversation) {
  if (!Array.isArray(conversation)) {
    return undefined;
  }
  
  // Limit conversation length (prevent DoS)
  const maxMessages = 100;
  const limited = conversation.slice(0, maxMessages);
  
  return limited.map(msg => {
    if (!msg || typeof msg !== 'object') {
      return null;
    }
    
    return {
      type: sanitizeString(String(msg.type || 'user')),
      text: sanitizeString(String(msg.text || '')),
      timestamp: msg.timestamp || new Date().toISOString(),
      // Only include safe fields
    };
  }).filter(Boolean);
}

/**
 * Validate and sanitize phone number input
 */
export function sanitizePhoneInput(phone) {
  if (!phone || typeof phone !== 'string') {
    return null;
  }
  
  // Remove all non-digit and non-plus characters
  return phone.replace(/[^\d+]/g, '').slice(0, 20); // Max 20 chars
}

/**
 * Validate and sanitize microsite name
 */
export function sanitizeMicrosite(microsite) {
  if (!microsite || typeof microsite !== 'string') {
    return null;
  }
  
  // Only allow alphanumeric, hyphens, underscores
  const sanitized = microsite.replace(/[^a-zA-Z0-9_-]/g, '');
  
  // Limit length
  return sanitized.slice(0, 100);
}

/**
 * Validate and sanitize project ID
 */
export function sanitizeProjectId(projectId) {
  if (!projectId || typeof projectId !== 'string') {
    return null;
  }
  
  // Only allow alphanumeric, hyphens, underscores, dots
  const sanitized = projectId.replace(/[^a-zA-Z0-9._-]/g, '');
  
  // Limit length
  return sanitized.slice(0, 100);
}

