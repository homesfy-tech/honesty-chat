/**
 * Environment Variable Validation
 * Ensures all required environment variables are set for production
 */

export function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Required for production
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Check if using connection string OR individual MySQL variables
    const hasConnectionString = !!(process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_URI);
    const hasIndividualVars = !!(process.env.MYSQL_HOST && process.env.MYSQL_USER);
    
    if (!hasConnectionString && !hasIndividualVars) {
      const missingVars = [];
      if (!process.env.DATABASE_URL && !process.env.MYSQL_URL && !process.env.MYSQL_URI) {
        missingVars.push('DATABASE_URL (or MYSQL_URL/MYSQL_URI)');
      }
      if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER) {
        missingVars.push('MYSQL_HOST and MYSQL_USER');
      }
      
      errors.push(
        `MySQL database connection is required for production deployment.\n` +
        `Missing: ${missingVars.join(' OR ')}\n` +
        `Options:\n` +
        `  1. Set DATABASE_URL=mysql://user:password@host:port/database\n` +
        `  2. OR set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE`
      );
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
    
    // Show what IS set (for debugging, without sensitive values)
    console.log('\n📋 Current environment status:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✓ set' : '✗ not set'}`);
    console.log(`   MYSQL_URL: ${process.env.MYSQL_URL ? '✓ set' : '✗ not set'}`);
    console.log(`   MYSQL_URI: ${process.env.MYSQL_URI ? '✓ set' : '✗ not set'}`);
    console.log(`   MYSQL_HOST: ${process.env.MYSQL_HOST ? '✓ set' : '✗ not set'}`);
    console.log(`   MYSQL_USER: ${process.env.MYSQL_USER ? '✓ set' : '✗ not set'}`);
    console.log(`   MYSQL_DATABASE: ${process.env.MYSQL_DATABASE ? '✓ set' : '✗ not set'}`);
    
    throw new Error(`Environment validation failed: ${errors.join('; ')}`);
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Environment variables validated');
  }
}

