import express from "express";
import { config } from "../config.js";
import { requireApiKey } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Helper function to get the right storage module
async function getConfigStore() {
  if (config.dataStore === "mongodb") {
    const store = await import("../storage/mongoWidgetConfigStore.js");
    return {
      getWidgetConfig: store.getWidgetConfig,
      updateWidgetConfig: store.updateWidgetConfig,
    };
  } else {
    const store = await import("../storage/widgetConfigStore.js");
    return {
      getWidgetConfig: store.getWidgetConfig,
      updateWidgetConfig: store.upsertWidgetConfig,
    };
  }
}

// GET is public - widget needs to read config
router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { getWidgetConfig } = await getConfigStore();
    const config = await getWidgetConfig(projectId);

    // Return empty config if not found (widget will use defaults)
    res.json(config || {});
  } catch (error) {
    logger.error("Failed to fetch widget config", error);
    // Return empty config instead of error - widget will use defaults
    res.status(200).json({});
  }
});

// POST requires API key authentication - protects config updates
router.post("/:projectId", requireApiKey, async (req, res) => {
  try {
    const { projectId } = req.params;
    const update = req.body;

    const { updateWidgetConfig } = await getConfigStore();

    // If using MongoDB, update directly (works on Vercel too!)
    if (config.dataStore === "mongodb") {
      const updatedConfig = await updateWidgetConfig(projectId, update);
      return res.json(updatedConfig);
    }

    // File storage: On Vercel (read-only filesystem), we can't write files
    if (process.env.VERCEL) {
      return res.status(200).json({
        message: "Config update received. On Vercel with file storage, config is read-only from git.",
        instruction: "Set MONGODB_URI environment variable to enable database storage, or update apps/api/data/widget-config.json locally, commit, and push to deploy.",
        receivedUpdate: update,
        projectId
      });
    }

    // Local development: update file directly
    const updatedConfig = await updateWidgetConfig(projectId, update);
    res.json(updatedConfig);
  } catch (error) {
    logger.error("Failed to update widget config", error);
    
    // Return error details (sanitized)
    const isDevelopment = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
    const errorResponse = {
      message: "Widget config update failed",
      error: isDevelopment ? error.message : "Internal server error",
    };
    
    res.status(200).json(errorResponse);
  }
});

export default router;


