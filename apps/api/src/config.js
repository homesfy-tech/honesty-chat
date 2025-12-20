import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from multiple possible locations
// Try current directory (apps/api) first, then parent directory
const envPaths = [
  path.join(__dirname, "..", "..", ".env"), // apps/api/.env
  path.join(__dirname, "..", "..", "..", ".env"), // root/.env
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    break; // Successfully loaded .env file
  }
}

// Also try default location (current working directory)
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

// Check if using individual MySQL variables (preferred method)
const hasIndividualVars = process.env.MYSQL_HOST && process.env.MYSQL_USER;

if (hasIndividualVars) {
  // Using individual MySQL variables - assume MySQL storage
  dataStore = "mysql";
} else if (databaseUrl) {
  // Check if connection string is a placeholder/template (common placeholder values)
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
    databaseUrl.toLowerCase().includes(pattern.toLowerCase())
  );
  
  // Also check if hostname looks like a placeholder after parsing
  let hostnamePlaceholder = false;
  if (databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mysql2://')) {
    try {
      const url = new URL(databaseUrl.replace(/^mysql2?:\/\//, 'http://'));
      const hostname = url.hostname.toLowerCase();
      hostnamePlaceholder = placeholderPatterns.some(pattern => 
        hostname.includes(pattern.toLowerCase())
      ) || hostname.includes('your-') || hostname.includes('example') || hostname.includes('placeholder');
    } catch {
      // If URL parsing fails, we'll handle it later
    }
  }
  
  if (!hasPlaceholderPattern && !hostnamePlaceholder) {
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


