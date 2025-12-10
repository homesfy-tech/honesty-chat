import dotenv from "dotenv";

dotenv.config();

const normalizedPort =
  process.env.API_PORT && process.env.API_PORT.trim()
    ? Number(process.env.API_PORT.trim())
    : 4000;

const isVercel = Boolean(process.env.VERCEL);

// Storage: Use MongoDB if MONGODB_URI is set, otherwise use file-based storage
// MongoDB is preferred for production (persistent, scalable)
// File storage is fallback for development or when MongoDB is not configured

export const config = {
  port: Number.isFinite(normalizedPort) ? normalizedPort : 4000,
  allowedOrigins: ((process.env.ALLOWED_ORIGINS || "*").trim())
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  dataStore: process.env.MONGODB_URI ? "mongodb" : "file",
  mongodbUri: process.env.MONGODB_URI || null,
  widgetConfigApiKey: (process.env.WIDGET_CONFIG_API_KEY && process.env.WIDGET_CONFIG_API_KEY.trim()) || null,
};


