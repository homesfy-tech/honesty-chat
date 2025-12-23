import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { networkInterfaces } from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to check if an IP address is available on this machine
function isIpAvailable(ip) {
  if (!ip || ip === "0.0.0.0" || ip === "localhost" || ip === "127.0.0.1") {
    return true; // These are always available
  }
  
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.address === ip) {
        return true;
      }
    }
  }
  return false;
}

export default defineConfig(({ mode }) => {
  // Load env file from root directory (parent of apps/dashboard)
  // This allows using a single .env file at the project root
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const rootDir = path.resolve(__dirname, '../..');
  const env = loadEnv(mode, rootDir, '');
  
  // Determine host based on environment variable, NODE_ENV, and Vite mode
  // In development mode (NODE_ENV !== 'production' AND mode === 'development'), always use 0.0.0.0
  // In production mode (NODE_ENV === 'production' OR mode === 'production'), use VITE_SERVER_HOST if set
  // Otherwise default to "0.0.0.0" (listens on all interfaces)
  const isProduction = process.env.NODE_ENV === 'production' || mode === 'production';
  // Check both env loaded from file and process.env (for environment variables set directly)
  const viteServerHost = env.VITE_SERVER_HOST || process.env.VITE_SERVER_HOST;
  
  // Determine the server host
  // Check if IP is available, if not available in production, fall back to 0.0.0.0 to avoid binding errors
  let serverHost = "0.0.0.0";
  if (isProduction && viteServerHost) {
    if (isIpAvailable(viteServerHost)) {
      serverHost = viteServerHost;
      console.log(`[Vite Config] Production mode: Using VITE_SERVER_HOST=${viteServerHost}`);
    } else {
      console.warn(`[Vite Config] ⚠️  IP ${viteServerHost} is not available on this machine.`);
      console.warn(`[Vite Config] ⚠️  Falling back to 0.0.0.0 (will listen on all available interfaces).`);
      console.warn(`[Vite Config] ℹ️  To use ${viteServerHost}, you must run this on the server where this IP is assigned.`);
      serverHost = "0.0.0.0";
    }
  }
  
  console.log(`[Vite Config] NODE_ENV: ${process.env.NODE_ENV}, mode: ${mode}, VITE_SERVER_HOST: ${viteServerHost}, serverHost: ${serverHost}`);
  
  return {
    plugins: [react()],
    server: {
      host: serverHost,
      port: 5173,
      hmr: false, // Disable Hot Module Replacement to prevent auto-reloads
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
          secure: false, // Allow proxying to HTTP from HTTPS
          ws: true, // Enable WebSocket proxying
          timeout: 30000, // 30 second timeout
          configure: (proxy, _options) => {
            proxy.on('error', (err, req, res) => {
              console.error('❌ Vite Proxy Error:', err.message);
              console.error('   Request URL:', req.url);
              console.error('   Target:', _options.target);
              console.error('   Possible causes:');
              console.error('   1. API server not running on http://localhost:4000');
              console.error('   2. API server not accessible from Vite dev server');
              console.error('   3. Firewall blocking localhost connections');
              
              // Send error response to client
              if (res && !res.headersSent) {
                res.writeHead(502, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({
                  error: 'Proxy Error',
                  message: 'Cannot connect to API server. Please ensure the API server is running on http://localhost:4000',
                  details: err.message,
                }));
              }
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`📡 Proxying: ${req.method} ${req.url} -> ${proxyReq.path}`);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log(`✅ Proxy Response: ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
            });
          },
        },
        // Add /uploads proxy for image files
        "/uploads": {
          target: "http://localhost:4000",
          changeOrigin: true,
          secure: false, // Allow proxying to HTTP from HTTPS
          timeout: 30000, // 30 second timeout
          configure: (proxy, _options) => {
            proxy.on('error', (err, req, res) => {
              console.error('❌ Vite Proxy Error (uploads):', err.message);
              console.error('   Request URL:', req.url);
              console.error('   Target:', _options.target);
              console.error('   Possible causes:');
              console.error('   1. API server not running on http://localhost:4000');
              console.error('   2. Upload file not found on server');
              console.error('   3. Firewall blocking localhost connections');
              
              // Send error response to client
              if (res && !res.headersSent) {
                res.writeHead(502, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({
                  error: 'Proxy Error',
                  message: 'Cannot load upload file. Please ensure the API server is running on http://localhost:4000',
                  details: err.message,
                }));
              }
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`📡 Proxying upload: ${req.method} ${req.url} -> ${proxyReq.path}`);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log(`✅ Proxy Response (upload): ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
            });
          },
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


