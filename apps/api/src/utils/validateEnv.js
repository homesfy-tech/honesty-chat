/**
 * Environment Variable Validation
 * Ensures all required environment variables are set for production
 */

export function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Required for production
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    if (!process.env.MONGODB_URI) {
      errors.push('MONGODB_URI is required for production deployment');
    }
    
    if (!process.env.WIDGET_CONFIG_API_KEY) {
      warnings.push('WIDGET_CONFIG_API_KEY is not set - config updates will be unprotected');
    }
    
    if (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS === '*') {
      warnings.push('ALLOWED_ORIGINS is set to "*" - consider restricting to specific domains for production');
    }
  }

  // Validate MongoDB URI format if set
  if (process.env.MONGODB_URI) {
    const uri = process.env.MONGODB_URI.trim();
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      errors.push('MONGODB_URI must start with mongodb:// or mongodb+srv://');
    }
  }

  // Validate API key strength if set
  if (process.env.WIDGET_CONFIG_API_KEY) {
    const key = process.env.WIDGET_CONFIG_API_KEY.trim();
    if (key.length < 32) {
      warnings.push('WIDGET_CONFIG_API_KEY should be at least 32 characters for security');
    }
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Environment variable warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  // Throw errors
  if (errors.length > 0) {
    console.error('❌ Environment variable errors:');
    errors.forEach(error => console.error(`   - ${error}`));
    throw new Error(`Environment validation failed: ${errors.join('; ')}`);
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Environment variables validated');
  }
}

