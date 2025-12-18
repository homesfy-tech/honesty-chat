import dotenv from "dotenv";

dotenv.config();

const normalizedPort =
  process.env.API_PORT && process.env.API_PORT.trim()
    ? Number(process.env.API_PORT.trim())
    : 4000;

// Storage: Use MySQL if DATABASE_URL is set, otherwise file-based storage
// MySQL is preferred for production (better for relational data, location support)
// File storage is for development only

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_URI;

let dataStore = "file";
if (databaseUrl) {
  // Check if connection string is a placeholder/template (common placeholder values)
  const isPlaceholder = databaseUrl.includes('username:password@host') || 
                        databaseUrl.includes('user:pass@host') ||
                        (databaseUrl.includes('@host:') && !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1') && !databaseUrl.includes('.'));
  
  if (!isPlaceholder) {
    dataStore = "mysql";
  }
}

export const config = {
  port: Number.isFinite(normalizedPort) ? normalizedPort : 4000,
  allowedOrigins: ((process.env.ALLOWED_ORIGINS || "*").trim())
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  dataStore: dataStore,
  databaseUrl: databaseUrl || null,
  widgetConfigApiKey: (process.env.WIDGET_CONFIG_API_KEY && process.env.WIDGET_CONFIG_API_KEY.trim()) || null,
};


