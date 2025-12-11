import dotenv from "dotenv";

dotenv.config();

const normalizedPort =
  process.env.API_PORT && process.env.API_PORT.trim()
    ? Number(process.env.API_PORT.trim())
    : 4000;

// Storage: Use PostgreSQL if DATABASE_URL is set, otherwise file-based storage
// PostgreSQL is preferred for production (better for relational data, location support)
// File storage is for development only

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRESQL_URI;

let dataStore = "file";
if (databaseUrl) {
  dataStore = "postgresql";
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


