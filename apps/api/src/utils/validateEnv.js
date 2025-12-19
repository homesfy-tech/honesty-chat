/**
 * Environment Variable Validation
 * Ensures all required environment variables are set for production
 */

export function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Required for production
  if (process.env.NODE_ENV === 'production') {
    // Check if using connection string OR individual MySQL variables
    const hasConnectionString = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_URI;
    const hasIndividualVars = process.env.MYSQL_HOST && process.env.MYSQL_USER;
    
    if (!hasConnectionString && !hasIndividualVars) {
      errors.push('DATABASE_URL (or MYSQL_URL/MYSQL_URI) OR individual MYSQL_* variables (MYSQL_HOST, MYSQL_USER, etc.) are required for production deployment');
    }
    
    if (!process.env.WIDGET_CONFIG_API_KEY) {
      warnings.push('WIDGET_CONFIG_API_KEY is not set - config updates will be unprotected');
    }
    
    if (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS === '*') {
      warnings.push('ALLOWED_ORIGINS is set to "*" - consider restricting to specific domains for production');
    }
  }

  // Validate MySQL URI format if set
  if (process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_URI) {
    const uri = (process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_URI).trim();
    if (!uri.startsWith('mysql://') && !uri.startsWith('mysql2://')) {
      warnings.push('DATABASE_URL should start with mysql:// or mysql2:// for MySQL connection');
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

