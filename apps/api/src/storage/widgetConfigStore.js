import crypto from "crypto";
import { readJson, writeJson } from "./fileStore.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

// Import config file directly for Vercel (ensures it's included in build)
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const configFilePath = path.resolve(moduleDir, "../../data/widget-config.json");
// Also try from process.cwd() for Vercel
const configFilePathAlt = path.resolve(process.cwd(), "data/widget-config.json");

let widgetConfigData = null;
function loadConfigFile() {
  // On Vercel, the file structure is different - try multiple paths
  const cwd = process.cwd();
  const pathsToTry = [
    // Try relative to module first (local dev)
    configFilePath,
    // Try from various Vercel build locations
    path.join(cwd, "apps/api/data/widget-config.json"),
    path.join(cwd, "api/data/widget-config.json"),
    path.join(cwd, "data/widget-config.json"),
    path.join(cwd, "../data/widget-config.json"),
    path.join(cwd, "../../data/widget-config.json"),
    // Fallback: try from process.cwd() root
    configFilePathAlt,
  ];
  
  for (const filePath of pathsToTry) {
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      console.log(`✅ Config file loaded successfully from: ${filePath}`);
      console.log(`   CWD: ${cwd}`);
      console.log(`   Module dir: ${moduleDir}`);
      return parsed;
    } catch (error) {
      // Log each failed attempt in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`   Tried: ${filePath} - ${error.code || error.message}`);
      }
      continue;
    }
  }
  
  // If all paths failed, log detailed error (but don't throw - return null gracefully)
  console.warn("⚠️ Could not load config file from any path - using defaults");
  if (process.env.NODE_ENV === 'development' || process.env.VERCEL) {
    console.warn("   Tried paths:", pathsToTry);
    console.warn("   Current working directory:", cwd);
    console.warn("   Module directory:", moduleDir);
    console.warn("   Vercel environment:", !!process.env.VERCEL);
  }
  
  // Return null instead of throwing - let the caller handle it
  return null;
}

// Load config at module initialization - don't crash if file not found
try {
  widgetConfigData = loadConfigFile();
  if (!widgetConfigData) {
    console.warn("⚠️ Widget config file not found at initialization - will use defaults");
    widgetConfigData = DEFAULT_STORE;
  }
} catch (error) {
  console.error("❌ Error loading widget config at initialization:", error.message);
  console.warn("⚠️ Using default empty config - widget will use hardcoded defaults");
  widgetConfigData = DEFAULT_STORE;
}

const FILE_NAME = "widget-config.json";
const DEFAULT_STORE = { configs: [] };

async function loadStore() {
  // CRITICAL: Always reload from file to ensure latest config
  // On Vercel, the file is read-only from git, so we need to reload it on each request
  // to get the latest deployed version (after git push + Vercel redeploy)
  const freshConfig = loadConfigFile();
  if (freshConfig) {
    // Update the cached version with fresh data
    widgetConfigData = freshConfig;
    if (process.env.VERCEL) {
      console.log("🔄 Vercel: Reloaded config from file (ensures latest deployed config)");
    } else {
      console.log("🔄 Local dev: Reloaded config from file (changes will appear immediately)");
    }
    return freshConfig;
  }
  
  // Fallback: if file load failed, try cached version
  if (widgetConfigData) {
    console.warn("⚠️ Using cached config (file load failed)");
    return widgetConfigData;
  }
  
  // Last resort: try reading from file system (for local development)
  return readJson(FILE_NAME, DEFAULT_STORE);
}

async function saveStore(store) {
  await writeJson(FILE_NAME, store);
}

const DEFAULT_THEME = {
  agentName: "Riya from Homesfy",
  avatarUrl:
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzlzZ2R4b3J2OHJ2MjFpd3RiZW5sbmxwOHVzb3RrdmNmZTh5Z25mYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/g9582DNuQppxC/giphy.gif",
  primaryColor: "#6158ff",
  followupMessage: "Sure… I’ll send that across right away!",
  bhkPrompt: "Which configuration you are looking for?",
  inventoryMessage: "That’s cool… we have inventory available with us.",
  phonePrompt: "Please enter your mobile number...",
  thankYouMessage: "Thanks! Our expert will call you shortly 📞",
  bubblePosition: "bottom-right",
  autoOpenDelayMs: 4000,
  welcomeMessage: "Hi, I’m Riya from Homesfy 👋\nHow can I help you today?",
};

const ALLOWED_FIELDS = [
  "agentName",
  "avatarUrl",
  "primaryColor",
  "followupMessage",
  "bhkPrompt",
  "inventoryMessage",
  "phonePrompt",
  "thankYouMessage",
  "bubblePosition",
  "autoOpenDelayMs",
  "welcomeMessage",
  "propertyInfo",
  "createdBy",
  "updatedBy",
];

function sanitizeUpdate(update = {}) {
  const sanitized = ALLOWED_FIELDS.reduce((acc, field) => {
    if (
      Object.prototype.hasOwnProperty.call(update, field) &&
      update[field] !== undefined
    ) {
      acc[field] = update[field];
    }
    return acc;
  }, {});
  
  // Always include propertyInfo if present, even if not in ALLOWED_FIELDS
  // This allows for nested object updates
  if (update.propertyInfo && typeof update.propertyInfo === "object") {
    sanitized.propertyInfo = update.propertyInfo;
  }
  
  return sanitized;
}

// Cache to prevent repeated lookups and excessive logging
const configCache = new Map();
const lastLogTime = new Map();
const LOG_INTERVAL_MS = 60000; // Only log once per minute per projectId

export async function getWidgetConfig(projectId) {
  // CRITICAL: Always reload from file (don't use cache)
  // This ensures config changes appear immediately after git push + Vercel redeploy
  // Clear cache to force fresh load from file
  configCache.delete(projectId);
  
  // Always reload store from file to get latest config
  const store = await loadStore();
  
  // Log store contents for debugging (only occasionally)
  const currentTime = Date.now();
  const lastLog = lastLogTime.get(projectId) || 0;
  const shouldLog = (currentTime - lastLog) > LOG_INTERVAL_MS;
  
  if (process.env.VERCEL && shouldLog) {
    console.log(`📁 Store loaded: ${store.configs?.length || 0} configs found`);
    console.log(`📁 Looking for projectId: ${projectId}`);
    lastLogTime.set(projectId, currentTime);
  }
  
  const existing = store.configs.find((item) => item.projectId === projectId);

  if (existing) {
    // Only log occasionally to reduce console spam
    if (shouldLog || (!process.env.VERCEL && process.env.NODE_ENV !== 'production')) {
      console.log(`✅ Found config for projectId: ${projectId}`);
      if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
        console.log(`📋 Config details: agentName="${existing.agentName}", primaryColor="${existing.primaryColor}"`);
      }
    }
    // Cache the result (only in production, local dev always reloads)
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      configCache.set(projectId, existing);
    }
    return existing;
  }
  
  if (shouldLog) {
    console.log(`⚠️  Config not found for projectId: ${projectId}, creating default`);
  }

  const timestamp = new Date().toISOString();
  const config = {
    id: crypto.randomUUID(),
    projectId,
    ...DEFAULT_THEME,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.configs.push(config);
  await saveStore(store);
  // Cache the newly created config
  configCache.set(projectId, config);
  return config;
}

export async function upsertWidgetConfig(projectId, update) {
  const sanitizedUpdate = sanitizeUpdate(update);
  const store = await loadStore();
  const timestamp = new Date().toISOString();
  const index = store.configs.findIndex((item) => item.projectId === projectId);

  if (index === -1) {
    const config = {
      id: crypto.randomUUID(),
      projectId,
      ...DEFAULT_THEME,
      ...sanitizedUpdate,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.configs.push(config);
    await saveStore(store);
    // Update cache
    configCache.set(projectId, config);
    return config;
  }

  const updated = {
    ...store.configs[index],
    ...sanitizedUpdate,
    projectId,
    updatedAt: timestamp,
  };

  store.configs[index] = updated;
  await saveStore(store);
  // Update cache
  configCache.set(projectId, updated);
  return updated;
}


