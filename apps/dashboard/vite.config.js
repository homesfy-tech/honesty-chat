import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      hmr: false, // Disable Hot Module Replacement to prevent auto-reloads
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
    // Explicitly define env variables to ensure they're available
    define: {
      'import.meta.env.VITE_DASHBOARD_USERNAME': JSON.stringify(env.VITE_DASHBOARD_USERNAME || 'admin'),
      'import.meta.env.VITE_DASHBOARD_PASSWORD': JSON.stringify(env.VITE_DASHBOARD_PASSWORD || 'admin'),
    },
  };
});


