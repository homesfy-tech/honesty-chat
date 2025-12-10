// Authentication Configuration
// Multi-user support via API authentication
// Users are managed through API endpoint /api/users

// API Base URL for authentication
export const authApiUrl = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")}/api/users`
  : "/api/users";

// Legacy single-user support (for backward compatibility)
// If API authentication fails, fall back to this
export const legacyAuthConfig = {
  username: import.meta.env.VITE_DASHBOARD_USERNAME || "admin",
  password: import.meta.env.VITE_DASHBOARD_PASSWORD || "admin",
};

