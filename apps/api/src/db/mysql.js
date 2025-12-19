import mysql from 'mysql2/promise';

let pool = null;

/**
 * Initialize MySQL connection pool
 */
export async function connectMySQL() {
  if (pool) {
    return pool;
  }

  const connectionString = (process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_URI)?.trim();

  // Check if using connection string OR individual MySQL variables
  const hasIndividualVars = process.env.MYSQL_HOST && process.env.MYSQL_USER;
  
  if ((!connectionString || connectionString.length === 0) && !hasIndividualVars) {
    throw new Error('Either DATABASE_URL (or MYSQL_URL/MYSQL_URI) OR individual MYSQL_* variables (MYSQL_HOST, MYSQL_USER, etc.) must be set');
  }

  // Check if connection string is a placeholder/template (only if using connection string)
  if (connectionString && connectionString.length > 0) {
    const placeholderPatterns = [
      'username:password@host',
      'user:pass@host',
      '@host:',
      'mysql://host',
      'mysql2://host',
      'your-db-host',
      'example.com',
      'placeholder',
      'your-host',
      'localhost.local'
    ];
    
    // Check for placeholder patterns in the connection string
    const hasPlaceholderPattern = placeholderPatterns.some(pattern => 
      connectionString.toLowerCase().includes(pattern.toLowerCase())
    );
    
    // Also check if hostname looks like a placeholder after parsing
    let hostnamePlaceholder = false;
    if (connectionString.startsWith('mysql://') || connectionString.startsWith('mysql2://')) {
      try {
        const url = new URL(connectionString.replace(/^mysql2?:\/\//, 'http://'));
        const hostname = url.hostname.toLowerCase();
        hostnamePlaceholder = placeholderPatterns.some(pattern => 
          hostname.includes(pattern.toLowerCase())
        ) || hostname.includes('your-') || hostname.includes('example') || hostname.includes('placeholder');
      } catch {
        // If URL parsing fails, we'll handle it later
      }
    }
    
    if (hasPlaceholderPattern || hostnamePlaceholder) {
      throw new Error('DATABASE_URL appears to be a placeholder. Please set a valid MySQL connection string. Expected format: mysql://username:password@hostname:port/database');
    }
  }

  // Parse connection string or use individual variables
  let connectionConfig;
  
  if (connectionString && (connectionString.startsWith('mysql://') || connectionString.startsWith('mysql2://'))) {
    // Parse MySQL connection string: mysql://user:password@host:port/database
    try {
      const url = new URL(connectionString.replace(/^mysql2?:\/\//, 'http://'));
      const hostname = url.hostname;
      
      // Check if this is an AWS RDS endpoint (contains .rds.amazonaws.com)
      const isAwsRds = hostname.includes('.rds.amazonaws.com');
      
      // Determine SSL configuration
      // AWS RDS typically requires SSL, enable it for RDS endpoints or production
      let sslConfig = false;
      if (isAwsRds || process.env.NODE_ENV === 'production' || process.env.MYSQL_SSL === 'true') {
        sslConfig = { rejectUnauthorized: false };
      }
      
      // URL API automatically decodes URL-encoded values
      connectionConfig = {
        host: hostname,
        port: parseInt(url.port) || 3306,
        user: url.username || 'root',
        password: url.password || '',
        database: url.pathname.slice(1) || 'homesfy_chat', // Remove leading '/'
        ssl: sslConfig,
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        connectTimeout: 15000, // 15 seconds
      };
    } catch (error) {
      throw new Error(`Invalid MySQL connection string format: ${error.message}`);
    }
  } else if (process.env.MYSQL_HOST || process.env.MYSQL_USER) {
    // Use individual MySQL environment variables
    const hostname = process.env.MYSQL_HOST || 'localhost';
    const isAwsRds = hostname.includes('.rds.amazonaws.com');
    
    // Determine SSL configuration
    let sslConfig = false;
    if (isAwsRds || process.env.NODE_ENV === 'production' || process.env.MYSQL_SSL === 'true') {
      sslConfig = { rejectUnauthorized: false };
    }
    
    connectionConfig = {
      host: hostname,
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'homesfy_chat',
      ssl: sslConfig,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: 15000, // 15 seconds
    };
  } else {
    // Try to parse as JSON string
    try {
      connectionConfig = JSON.parse(connectionString);
    } catch {
      // Provide more helpful error message
      const formatHint = connectionString.length < 100 
        ? ` Current value: "${connectionString}"` 
        : ` Current value starts with: "${connectionString.substring(0, 50)}..."`;
      throw new Error(
        `DATABASE_URL must be a MySQL connection string (mysql://...) or individual MYSQL_* environment variables must be set.${formatHint}\n` +
        `Expected format: mysql://username:password@hostname:port/database\n` +
        `Example: mysql://root:password@localhost:3306/homesfy_chat`
      );
    }
  }

  console.log('🔗 Creating MySQL connection pool...');
  console.log(`   Connecting to: ${connectionConfig.host}:${connectionConfig.port}`);
  console.log(`   Database: ${connectionConfig.database}`);
  console.log(`   User: ${connectionConfig.user}`);
  console.log(`   SSL: ${connectionConfig.ssl ? 'enabled' : 'disabled'}`);
  
  pool = mysql.createPool(connectionConfig);

  // Test the connection with better error reporting and timeout
  console.log('🔍 Testing MySQL connection...');
  let connection;
  try {
    // Add a timeout wrapper to prevent hanging
    const connectionPromise = pool.getConnection();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 15 seconds. Check if the database host is reachable and security groups allow your IP.')), 15000)
    );
    
    connection = await Promise.race([connectionPromise, timeoutPromise]);
    console.log('✅ Connected to MySQL');
    console.log(`   Host: ${connectionConfig.host}:${connectionConfig.port}`);
    console.log(`   Database: ${connectionConfig.database}`);
    connection.release();
  } catch (error) {
    console.error('❌ Failed to connect to MySQL:', error.message);
    console.error(`   Host: ${connectionConfig.host}:${connectionConfig.port}`);
    console.error(`   Database: ${connectionConfig.database}`);
    console.error(`   User: ${connectionConfig.user}`);
    
    // Provide helpful error messages for common issues
    if (error.message && error.message.includes('timeout')) {
      throw new Error(`Connection timeout. Cannot reach ${connectionConfig.host}:${connectionConfig.port}. Check: 1) Security group allows your IP on port 3306, 2) Network connectivity, 3) Hostname is correct`);
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error(`Connection refused. Check if MySQL is running and accessible at ${connectionConfig.host}:${connectionConfig.port}`);
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      throw new Error(`Cannot reach database host: ${connectionConfig.host}. Check your network connection and hostname.`);
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ER_NOT_SUPPORTED_AUTH_MODE') {
      throw new Error(`Authentication failed. Check username and password. User: ${connectionConfig.user}`);
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      throw new Error(`Database '${connectionConfig.database}' does not exist. Please create it first.`);
    } else {
      throw error;
    }
  }

  return pool;
}

/**
 * Get MySQL connection pool
 */
export function getPool() {
  if (!pool) {
    throw new Error('MySQL not connected. Call connectMySQL() first.');
  }
  return pool;
}

/**
 * Execute a query
 */
export async function query(text, params) {
  if (!pool) {
    throw new Error('MySQL not connected. Connection may have failed during initialization.');
  }
  
  const dbPool = getPool();
  const start = Date.now();
  try {
    const [rows, fields] = await dbPool.execute(text, params);
    const duration = Date.now() - start;
    // Only log queries in development mode and if they're not schema initialization queries
    if (process.env.NODE_ENV !== 'production' && !text.trim().toUpperCase().startsWith('CREATE')) {
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: Array.isArray(rows) ? rows.length : 0 });
    }
    // Return in similar format with rows property for compatibility
    return {
      rows: Array.isArray(rows) ? rows : [rows],
      rowCount: Array.isArray(rows) ? rows.length : (rows ? 1 : 0),
      fields: fields
    };
    } catch (error) {
      // Don't log expected errors (duplicate keys, already exists) - they'll be handled upstream
      const isExpectedError = error.code === 'ER_DUP_KEYNAME' || 
                             error.code === 'ER_DUP_ENTRY' ||
                             (error.message && (
                               error.message.includes('already exists') || 
                               error.message.includes('Duplicate')
                             ));
      
      if (!isExpectedError) {
        console.error('Query error:', error);
      }
      throw error;
    }
}

/**
 * Initialize database schema (run migrations)
 */
export async function initializeSchema() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolons and execute each statement
    // Filter out comments and empty statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        const trimmed = s.trim();
        return trimmed.length > 0 && 
               !trimmed.startsWith('--') && 
               !trimmed.startsWith('/*') &&
               trimmed !== '';
      });
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await query(statement);
        } catch (error) {
          // Ignore "already exists" errors (tables/functions/indexes might already exist)
          if (error.code === 'ER_DUP_KEYNAME' || 
              error.code === 'ER_DUP_ENTRY' ||
              (error.message && (error.message.includes('already exists') || error.message.includes('Duplicate')))) {
            // Silently skip - this is expected when schema already exists
            continue;
          }
          throw error;
        }
      }
    }
    
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Failed to initialize schema:', error);
    throw error;
  }
}

/**
 * Close the connection pool
 */
export async function closeMySQL() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ MySQL connection closed');
  }
}

