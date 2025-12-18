import crypto from "crypto";
import { readJson, writeJson } from "./fileStore.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const configFilePath = path.resolve(moduleDir, "../../data/widget-config.json");
const configFilePathAlt = path.resolve(process.cwd(), "data/widget-config.json");

const FILE_NAME = "widget-config.json";
const DEFAULT_STORE = { configs: [] };

let widgetConfigData = null;
function loadConfigFile() {
  const cwd = process.cwd();
  const pathsToTry = [
    configFilePath,
    path.join(cwd, "apps/api/data/widget-config.json"),
    path.join(cwd, "api/data/widget-config.json"),
    path.join(cwd, "data/widget-config.json"),
    path.join(cwd, "../data/widget-config.json"),
    path.join(cwd, "../../data/widget-config.json"),
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
  if (process.env.NODE_ENV === 'development') {
    console.warn("   Tried paths:", pathsToTry);
    console.warn("   Current working directory:", cwd);
    console.warn("   Module directory:", moduleDir);
  }
  
  // Return null instead of throwing - let the caller handle it
  return null;
}

// Load config at module initialization - don't crash if file not found
(function initializeConfig() {
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
})();

async function loadStore() {
  const freshConfig = loadConfigFile();
  if (freshConfig) {
    widgetConfigData = freshConfig;
    return freshConfig;
  }
  
  if (widgetConfigData) {
    return widgetConfigData;
  }
  
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
  configCache.delete(projectId);
  
  // Always reload store from file to get latest config
  const store = await loadStore();
  
  // Log store contents for debugging (only occasionally)
  const currentTime = Date.now();
  const lastLog = lastLogTime.get(projectId) || 0;
  const shouldLog = (currentTime - lastLog) > LOG_INTERVAL_MS;
  
  const existing = store.configs.find((item) => item.projectId === projectId);

  if (existing) {
    if (shouldLog || process.env.NODE_ENV !== 'production') {
      console.log(`✅ Found config for projectId: ${projectId}`);
    }
    if (process.env.NODE_ENV === 'production') {
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
  configCache.set(projectId, updated);
  return updated;
}


