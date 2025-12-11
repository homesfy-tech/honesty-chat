import axios from "axios";

const buildTimeBaseUrl = import.meta.env.VITE_API_BASE_URL;
const runtimeBaseUrl =
  typeof window !== "undefined" ? window.__HOMESFY_API_BASE_URL : undefined;

// Detect if we're in development mode
const isDevelopment = 
  import.meta.env.DEV || 
  (typeof window !== "undefined" && 
   (window.location.hostname === "localhost" || 
    window.location.hostname === "127.0.0.1"));

// Determine the API base URL
let apiBaseUrl;

if (isDevelopment) {
  // ALWAYS use Vite proxy in development (routes to localhost:4000)
  apiBaseUrl = "/api";
  console.log("🔧 Development mode: Using local API via Vite proxy (/api -> http://localhost:4000/api)");
} else {
  // Production mode: use runtime or build-time URL
  if (runtimeBaseUrl) {
    const trimmed = runtimeBaseUrl.trim().replace(/\/+$/, "");
    apiBaseUrl = trimmed ? (/\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`) : undefined;
  }
  
  if (!apiBaseUrl && buildTimeBaseUrl) {
    const trimmed = buildTimeBaseUrl.trim().replace(/\/+$/, "");
    apiBaseUrl = trimmed ? (/\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`) : undefined;
  }
  
  // Production fallback - should be set via VITE_API_BASE_URL during build
  if (!apiBaseUrl) {
    console.error("⚠️ VITE_API_BASE_URL not set - API calls may fail");
    apiBaseUrl = "/api"; // Fallback to relative path
  }
  
  console.log("🌐 Production mode: Using API at", apiBaseUrl);
}

export const api = axios.create({
  baseURL: apiBaseUrl,
});

// Add API key to requests if available
api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem("widget_config_api_key");
  if (apiKey && (config.url?.includes("/widget-config") || config.method === "post")) {
    config.headers["X-API-Key"] = apiKey;
  }
  return config;
});

