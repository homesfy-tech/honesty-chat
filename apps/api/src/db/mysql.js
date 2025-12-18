import mysql from 'mysql2/promise';

let pool = null;

/**
 * Initialize MySQL connection pool
 */
export async function connectMySQL() {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_URI;

  if (!connectionString) {
    throw new Error('DATABASE_URL, MYSQL_URL, or MYSQL_URI environment variable is not set');
  }

  // Check if connection string is a placeholder/template (common placeholder values)
  const isPlaceholder = connectionString.includes('username:password@host') || 
                        connectionString.includes('user:pass@host') ||
                        connectionString.includes('@host:') ||
                        (connectionString.includes('host') && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1') && !connectionString.includes('.'));
  
  if (isPlaceholder) {
    throw new Error('DATABASE_URL appears to be a placeholder. Please set a valid MySQL connection string.');
  }

  // Parse connection string or use it directly
  let connectionConfig;
  
  if (connectionString.startsWith('mysql://') || connectionString.startsWith('mysql2://')) {
    // Parse MySQL connection string: mysql://user:password@host:port/database
    try {
      const url = new URL(connectionString.replace(/^mysql2?:\/\//, 'http://'));
      connectionConfig = {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username || 'root',
        password: url.password || '',
        database: url.pathname.slice(1) || 'homesfy_chat', // Remove leading '/'
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      };
    } catch (error) {
      throw new Error(`Invalid MySQL connection string format: ${error.message}`);
    }
  } else if (process.env.MYSQL_HOST || process.env.MYSQL_USER) {
    // Use individual MySQL environment variables
    connectionConfig = {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'homesfy_chat',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    };
  } else {
    // Try to parse as JSON string
    try {
      connectionConfig = JSON.parse(connectionString);
    } catch {
      throw new Error('DATABASE_URL must be a MySQL connection string (mysql://...) or individual MYSQL_* environment variables must be set');
    }
  }

  pool = mysql.createPool(connectionConfig);

  // Test the connection
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL');
    connection.release();
  } catch (error) {
    console.error('❌ Failed to connect to MySQL:', error);
    throw error;
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
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', { text, duration, rows: Array.isArray(rows) ? rows.length : 0 });
    }
    // Return in similar format with rows property for compatibility
    return {
      rows: Array.isArray(rows) ? rows : [rows],
      rowCount: Array.isArray(rows) ? rows.length : (rows ? 1 : 0),
      fields: fields
    };
  } catch (error) {
    console.error('Query error:', error);
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
          // Ignore "already exists" errors (tables/functions might already exist)
          if (error.message && (error.message.includes('already exists') || error.message.includes('Duplicate'))) {
            console.log('⚠️  Schema element already exists, skipping:', statement.substring(0, 50));
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

