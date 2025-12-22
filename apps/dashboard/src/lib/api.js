import axios from "axios";

const buildTimeBaseUrl = import.meta.env.VITE_API_BASE_URL;
const runtimeBaseUrl =
  typeof window !== "undefined" ? window.__HOMESFY_API_BASE_URL : undefined;

// Detect if we're in development mode
// Check for: Vite dev mode, localhost, OR Vite dev server port (5173, 5174, etc.)
// IMPORTANT: If running on Vite dev server port, always treat as development
// Extract port and hostname for cleaner logic
const viteDevPorts = ["5173", "5174", "5175"];
let currentPort = "";
let currentHostname = "";
let currentUrl = "";
let currentHost = "";

if (typeof window !== "undefined") {
  currentPort = window.location.port || "";
  currentHostname = window.location.hostname || "";
  currentUrl = window.location.href || "";
  currentHost = window.location.host || ""; // This includes port: "3.108.159.14:5173"
  
  // Extract port from host (most reliable - includes port even when location.port is empty)
  if (currentHost && currentHost.includes(":")) {
    const hostParts = currentHost.split(":");
    if (hostParts.length > 1) {
      const hostPort = hostParts[hostParts.length - 1];
      if (hostPort && (!currentPort || currentPort === "")) {
        currentPort = hostPort;
      }
    }
  }
  
  // Also check if port is in the URL (for cases where port might not be in window.location.port)
  if (!currentPort && currentUrl) {
    const urlMatch = currentUrl.match(/:(\d+)/);
    if (urlMatch && urlMatch[1]) {
      currentPort = urlMatch[1];
    }
  }
}

// Check if we're on a Vite dev server port (most reliable indicator)
// Check multiple sources to be absolutely sure
const isViteDevPort = currentPort && viteDevPorts.includes(currentPort);
const isViteDevPortInUrl = currentUrl && viteDevPorts.some(port => currentUrl.includes(`:${port}`));
const isViteDevPortInHost = currentHost && viteDevPorts.some(port => {
  // Check if host ends with :port or contains :port/
  return currentHost.includes(`:${port}`) || currentHost.endsWith(`:${port}`);
});

// ALWAYS treat port 5173 as development mode - this is the most important check
// Priority: port detection > hostname check
const isDevelopment = 
  import.meta.env.DEV || 
  (typeof window !== "undefined" && 
   (// First check: Vite dev server ports (highest priority)
    isViteDevPort ||
    isViteDevPortInUrl ||
    isViteDevPortInHost ||
    // Second check: localhost
    currentHostname === "localhost" || 
    currentHostname === "127.0.0.1"));

// Debug logging (only in browser)
if (typeof window !== "undefined") {
  console.log("🔍 API Config Debug:", {
    "import.meta.env.DEV": import.meta.env.DEV,
    "hostname": currentHostname,
    "port": currentPort,
    "host": currentHost,
    "fullURL": currentUrl,
    "isViteDevPort": isViteDevPort,
    "isViteDevPortInUrl": isViteDevPortInUrl,
    "isViteDevPortInHost": isViteDevPortInHost,
    "isDevelopment": isDevelopment,
    "buildTimeBaseUrl": buildTimeBaseUrl,
    "runtimeBaseUrl": runtimeBaseUrl,
    "window.location.port": window.location.port,
    "window.location.host": window.location.host,
    "window.location.href": window.location.href
  });
  
  // If we're on a Vite dev port but not detected as dev, warn
  if ((isViteDevPort || isViteDevPortInUrl || isViteDevPortInHost) && !isDevelopment) {
    console.warn("⚠️ Port 5173 detected but not in development mode - forcing development mode!");
    // This shouldn't happen, but if it does, we'll see it in the logs
  }
}

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
  
  // Production fallback - use relative path if on same domain
  if (!apiBaseUrl) {
    apiBaseUrl = "/api"; // Use relative path (works with nginx proxy or same domain)
    console.log("🌐 Production mode: Using relative API path /api");
  } else {
    console.log("🌐 Production mode: Using API at", apiBaseUrl);
  }
  
  // Warn if no API base URL is set (only in production, not in dev)
  // Double-check we're actually in production mode before warning
  if (!buildTimeBaseUrl && !runtimeBaseUrl && !isDevelopment) {
    console.warn("⚠️ VITE_API_BASE_URL not set - API calls may fail");
    console.warn("   If you're running the Vite dev server, this warning should not appear.");
    console.warn("   Check that the port detection is working correctly.");
  }
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000, // 30 second timeout
});

// Request interceptor - log requests and add API key
api.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase() || "GET";
    const url = config.url || "";
    const fullURL = `${config.baseURL}${url}`;
    const apiKey = localStorage.getItem("widget_config_api_key");
    
    // Add API key if needed
    if (apiKey && (config.url?.includes("/widget-config") || config.method === "post")) {
      config.headers["X-API-Key"] = apiKey;
    }
    
    // Log request details (always log in development, or when debug=true)
    const shouldLog = typeof window !== "undefined" && 
                      (isDevelopment || window.location.search.includes("debug=true"));
    
    if (shouldLog) {
      console.log(`📤 API Request: ${method} ${fullURL}`, {
        params: config.params || {},
        hasApiKey: !!apiKey,
        headers: {
          ...config.headers,
          // Don't log full headers, just key info
          "Content-Type": config.headers["Content-Type"],
          "X-API-Key": apiKey ? "***" : undefined,
        },
      });
    }
    
    // Add request timestamp for timeout detection
    config.metadata = { startTime: Date.now() };
    
    return config;
  },
  (error) => {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ Request Configuration Error");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error:", error.message);
    console.error("This usually means the request was malformed before sending");
    console.error("Full Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor - log responses and handle errors
api.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toUpperCase() || "GET";
    const url = response.config?.url || "";
    const status = response.status;
    const data = response.data;
    const startTime = response.config?.metadata?.startTime;
    const responseTime = startTime ? Date.now() - startTime : null;
    
    // Check if response data is empty or invalid
    const isEmpty = data === null || data === undefined || 
                   (Array.isArray(data) && data.length === 0) ||
                   (typeof data === "object" && Object.keys(data).length === 0);
    
    // Log successful responses with data validation
    const shouldLog = typeof window !== "undefined" && 
                      (isDevelopment || window.location.search.includes("debug=true"));
    
    if (shouldLog) {
      const logData = {
        status: status,
        responseTime: responseTime ? `${responseTime}ms` : "unknown",
        hasData: !isEmpty,
        dataType: Array.isArray(data) ? "array" : typeof data,
      };
      
      if (Array.isArray(data)) {
        logData.dataLength = data.length;
      } else if (typeof data === "object" && data !== null) {
        logData.dataKeys = Object.keys(data).length;
      }
      
      console.log(`✅ API Response: ${method} ${url}`, logData);
      
      // Log slow responses
      if (responseTime && responseTime > 3000) {
        console.warn(`⚠️ Slow Response: ${method} ${url} took ${responseTime}ms (over 3 seconds)`);
        console.warn("   This might indicate database performance issues");
      }
      
      // Warn if data is empty (but not for health checks or delete operations)
      if (isEmpty && !url.includes("/health") && method !== "DELETE") {
        console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.warn(`⚠️ Empty Response: ${method} ${url} returned no data`);
        console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.warn("Possible Causes:");
        console.warn("   1. Database table is empty");
        console.warn("   2. Query filters returned no results");
        console.warn("   3. Database connection issue (check API logs)");
        console.warn("   4. API endpoint might not be returning data correctly");
        console.warn("Response:", { status, data });
      }
    }
    
    // Check for database-related indicators in response
    if (data && typeof data === "object") {
      const errorMessage = data.error || data.message || "";
      if (errorMessage.toLowerCase().includes("database") || 
          errorMessage.toLowerCase().includes("mysql") ||
          errorMessage.toLowerCase().includes("connection") ||
          errorMessage.toLowerCase().includes("sql")) {
        console.error("🗄️ Database Connection Issue Detected:", {
          url: url,
          error: errorMessage,
          fullResponse: data,
        });
        console.error("💡 Database Troubleshooting:");
        console.error("   1. Check if MySQL server is running");
        console.error("   2. Verify database credentials in .env file");
        console.error("   3. Check database connection: MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE");
        console.error("   4. Test database connection from API server");
      }
    }
    
    return response;
  },
  (error) => {
    const method = error.config?.method?.toUpperCase() || "GET";
    const url = error.config?.url || "";
    const baseURL = error.config?.baseURL || "";
    const fullURL = `${baseURL}${url}`;
    
    // Enhanced error logging with detailed diagnostics
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const statusText = error.response.statusText;
      const errorData = error.response.data || {};
      const errorMessage = errorData.error || errorData.message || statusText;
      
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error(`❌ API Error Response: ${method} ${fullURL}`);
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("Status:", status, statusText);
      console.error("Error Message:", errorMessage);
      console.error("Full Error Data:", errorData);
      
      // Categorize errors
      if (status === 404) {
        console.error("🔍 Error Type: Endpoint Not Found");
        console.error("💡 Solutions:");
        console.error("   1. Check if API endpoint exists: " + fullURL);
        console.error("   2. Verify API server is running the latest code");
        console.error("   3. Check API server logs for route registration");
      } else if (status === 500) {
        console.error("🔍 Error Type: Server Internal Error");
        console.error("💡 Solutions:");
        console.error("   1. Check API server logs for detailed error");
        console.error("   2. Verify database connection is working");
        console.error("   3. Check if all required environment variables are set");
        
        // Check for database errors in 500 response
        if (errorMessage.toLowerCase().includes("database") || 
            errorMessage.toLowerCase().includes("mysql") ||
            errorMessage.toLowerCase().includes("connection") ||
            errorMessage.toLowerCase().includes("sql") ||
            errorMessage.toLowerCase().includes("econnrefused")) {
          console.error("🗄️ Database Connection Error Detected!");
          console.error("💡 Database Troubleshooting:");
          console.error("   1. Verify MySQL server is running: mysql -h <host> -u <user> -p");
          console.error("   2. Check .env file for correct database credentials:");
          console.error("      - MYSQL_HOST");
          console.error("      - MYSQL_USER");
          console.error("      - MYSQL_PASSWORD");
          console.error("      - MYSQL_DATABASE");
          console.error("   3. Test connection from API server:");
          console.error("      curl http://localhost:4000/health");
          console.error("   4. Check API server logs for MySQL connection errors");
        }
      } else if (status === 401 || status === 403) {
        console.error("🔍 Error Type: Authentication/Authorization Error");
        console.error("💡 Solutions:");
        console.error("   1. Check if API key is required and set correctly");
        console.error("   2. Verify authentication credentials");
        console.error("   3. Check localStorage for 'widget_config_api_key'");
      } else if (status === 503) {
        console.error("🔍 Error Type: Service Unavailable");
        console.error("💡 Solutions:");
        console.error("   1. API server might be overloaded");
        console.error("   2. Database connection might be down");
        console.error("   3. Check API server health: curl http://localhost:4000/health");
      }
      
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
    } else if (error.request) {
      // Request was made but no response received
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error(`❌ API Network Error: ${method} ${fullURL}`);
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("Error Code:", error.code);
      console.error("Error Message:", error.message);
      console.error("Request URL:", fullURL);
      console.error("Base URL:", baseURL);
      console.error("API Endpoint:", url);
      
      // Categorize network errors
      if (error.code === "ECONNREFUSED" || error.message.includes("Network Error") || error.message.includes("Failed to fetch")) {
        console.error("🔍 Error Type: Connection Refused / Network Error");
        console.error("💡 Possible Causes & Solutions:");
        console.error("");
        console.error("1. API Server Not Running:");
        console.error("   - Check if API server is running on port 4000");
        console.error("   - Test: curl http://localhost:4000/health");
        console.error("   - Start API: cd apps/api && npm start");
        console.error("");
        console.error("2. Vite Proxy Issue:");
        console.error("   - Vite proxy cannot reach http://localhost:4000");
        console.error("   - Check Vite dev server terminal for proxy errors");
        console.error("   - Verify proxy config in vite.config.js");
        console.error("");
        console.error("3. Firewall/Network Blocking:");
        console.error("   - Check if firewall is blocking localhost:4000");
        console.error("   - Verify both services are on the same server");
        console.error("");
        console.error("4. Direct API Test:");
        if (typeof window !== "undefined") {
          const directApiUrl = `${window.location.protocol}//${window.location.hostname}:4000/api/health`;
          console.error(`   - Try: ${directApiUrl}`);
        }
        console.error("   - Or from server: curl http://localhost:4000/api/health");
      } else if (error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
        console.error("🔍 Error Type: Request Timeout");
        console.error("💡 Solutions:");
        console.error("   1. API server might be slow or overloaded");
        console.error("   2. Database query might be taking too long");
        console.error("   3. Check API server logs for slow queries");
        console.error("   4. Increase timeout in api.js (currently 30 seconds)");
      } else if (error.code === "ENOTFOUND" || error.message.includes("getaddrinfo")) {
        console.error("🔍 Error Type: DNS/Hostname Resolution Failed");
        console.error("💡 Solutions:");
        console.error("   1. Check if API base URL is correct");
        console.error("   2. Verify hostname is reachable");
        console.error("   3. Check network connectivity");
      }
      
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
    } else {
      // Something else happened
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("❌ API Error (Unknown):", error.message);
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("Full Error:", error);
      console.error("Error Stack:", error.stack);
    }
    
    return Promise.reject(error);
  }
);

// Health check utility function
export const checkApiHealth = async () => {
  try {
    console.log("🏥 Checking API Health...");
    const response = await api.get("/health");
    console.log("✅ API Health Check Successful:", response.data);
    
    // Check for database status in health response
    if (response.data && typeof response.data === "object") {
      const stats = response.data.stats || {};
      const dataStore = response.data.dataStore || response.data.storage || "unknown";
      
      console.log("📊 API Status:", {
        dataStore: dataStore,
        totalRequests: stats.totalRequests || 0,
        errors: stats.errors || 0,
        errorRate: stats.errorRate || "0%",
      });
      
      if (dataStore === "mysql" || dataStore === "database") {
        console.log("✅ Database: Connected (MySQL)");
      } else if (dataStore === "file") {
        console.warn("⚠️ Database: Using file storage (not recommended for production)");
      }
    }
    
    return response.data;
  } catch (error) {
    console.error("❌ API Health Check Failed!");
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Error:", error.response.data);
    } else if (error.request) {
      console.error("   Network Error: Cannot reach API server");
      console.error("   Check if API server is running on http://localhost:4000");
    } else {
      console.error("   Error:", error.message);
    }
    throw error;
  }
};

// Auto health check on module load (only in browser, only once)
if (typeof window !== "undefined" && !window.__API_HEALTH_CHECKED) {
  window.__API_HEALTH_CHECKED = true;
  // Run health check after a short delay to avoid blocking page load
  setTimeout(() => {
    checkApiHealth().catch(() => {
      // Health check failed, but don't block the app
      console.warn("⚠️ Initial API health check failed - this is normal if API is starting up");
    });
  }, 1000);
}

