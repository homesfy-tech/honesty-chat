// Vercel serverless function entry point
import bootstrap from "../src/server.js";

let appInstance = null;

// Initialize app once
async function getApp() {
  if (!appInstance) {
    try {
      console.log("🚀 Initializing API server for Vercel...");
      appInstance = await bootstrap();
      if (!appInstance) {
        throw new Error("Bootstrap returned null/undefined");
      }
      console.log("✅ API server initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize API server", error);
      console.error("Error stack:", error.stack);
      throw error;
    }
  }
  return appInstance;
}

// Export handler for Vercel
export default async function handler(req, res) {
  try {
    const app = await getApp();
    if (!app) {
      throw new Error("App instance is null");
    }
    // Call the Express app as a handler
    return app(req, res);
  } catch (error) {
    console.error("❌ Error in Vercel handler:", error);
    console.error("Error stack:", error.stack);
    
    // Set CORS headers even for errors
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key');
    
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Server error: " + (error.message || "Unknown error"),
        status: "error",
        timestamp: new Date().toISOString()
      });
    }
  }
}

