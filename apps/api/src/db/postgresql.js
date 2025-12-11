import pg from 'pg';
const { Pool } = pg;

let pool = null;

/**
 * Initialize PostgreSQL connection pool
 */
export async function connectPostgreSQL() {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRESQL_URI;

  if (!connectionString) {
    throw new Error('DATABASE_URL or POSTGRESQL_URI environment variable is not set');
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  });

  // Test the connection
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');
    client.release();
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    throw error;
  }

  return pool;
}

/**
 * Get PostgreSQL connection pool
 */
export function getPool() {
  if (!pool) {
    throw new Error('PostgreSQL not connected. Call connectPostgreSQL() first.');
  }
  return pool;
}

/**
 * Execute a query
 */
export async function query(text, params) {
  const dbPool = getPool();
  const start = Date.now();
  try {
    const res = await dbPool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
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
          if (error.message && error.message.includes('already exists')) {
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
export async function closePostgreSQL() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ PostgreSQL connection closed');
  }
}

