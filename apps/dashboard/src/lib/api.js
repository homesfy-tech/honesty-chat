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
  // Use relative path to ensure it goes through Vite proxy
  // IGNORE any VITE_API_BASE_URL in development - always use proxy
  apiBaseUrl = "/api";
  console.log("🔧 Development mode: Using local API via Vite proxy (/api -> http://localhost:4000/api)");
  console.log("🔧 Current origin:", typeof window !== "undefined" ? window.location.origin : "N/A");
  console.log("🔧 VITE_API_BASE_URL (ignored in dev):", buildTimeBaseUrl);
  console.log("🔧 Runtime base URL (ignored in dev):", runtimeBaseUrl);
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

// Ensure baseURL is always relative in development (never absolute)
if (isDevelopment && apiBaseUrl && (apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://"))) {
  console.warn("⚠️ Detected absolute URL in development, forcing relative path");
  apiBaseUrl = "/api";
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  // Ensure axios doesn't try to resolve to absolute URLs
  validateStatus: function (status) {
    return status >= 200 && status < 300; // default
  },
});

// Log the final axios configuration
console.log("📡 Axios instance created with baseURL:", api.defaults.baseURL);
console.log("📡 Is development:", isDevelopment);

// Add request interceptor to ensure relative URLs in development
api.interceptors.request.use((config) => {
  // In development, ensure we never use absolute URLs
  if (isDevelopment) {
    // Log the original config for debugging
    const originalBaseURL = config.baseURL;
    const originalUrl = config.url;
    
    // If the URL is absolute, make it relative
    if (config.url && (config.url.startsWith("http://") || config.url.startsWith("https://"))) {
      console.warn("⚠️ Intercepted absolute URL in development, converting to relative:", config.url);
      // Extract the path from the absolute URL
      try {
        const url = new URL(config.url);
        config.url = url.pathname + url.search;
      } catch (e) {
        // If URL parsing fails, just use the original
      }
    }
    
    // Ensure baseURL is relative
    if (config.baseURL && (config.baseURL.startsWith("http://") || config.baseURL.startsWith("https://"))) {
      console.warn("⚠️ Intercepted absolute baseURL in development, forcing relative path");
      console.warn("   Original baseURL:", originalBaseURL);
      config.baseURL = "/api";
    }
    
    // Log the final URL for debugging
    const finalUrl = config.baseURL + (config.url || "");
    if (finalUrl.startsWith("http://") || finalUrl.startsWith("https://")) {
      console.error("❌ ERROR: Request URL is absolute in development:", finalUrl);
      console.error("   Original baseURL:", originalBaseURL);
      console.error("   Original URL:", originalUrl);
      console.error("   This should never happen - using relative path instead");
      // Force relative path
      config.baseURL = "/api";
      if (config.url && config.url.startsWith("http")) {
        try {
          const url = new URL(config.url);
          config.url = url.pathname + url.search;
        } catch (e) {
          // If URL parsing fails, remove the protocol
          config.url = config.url.replace(/^https?:\/\/[^/]+/, "");
        }
      }
    } else {
      // Log successful relative URL
      console.log("✅ Request using relative URL:", finalUrl);
    }
  }
  
  // Add API key to requests if available
  const apiKey = localStorage.getItem("widget_config_api_key");
  if (apiKey && (config.url?.includes("/widget-config") || config.method === "post")) {
    config.headers["X-API-Key"] = apiKey;
  }
  
  return config;
});

