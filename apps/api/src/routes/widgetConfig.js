import express from "express";
import { config } from "../config.js";
import { requireApiKey } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Helper function to get the right storage module
async function getConfigStore() {
  if (config.dataStore === "mysql") {
    try {
      const store = await import("../storage/mysqlWidgetConfigStore.js");
      return {
        getWidgetConfig: store.getWidgetConfig,
        updateWidgetConfig: store.updateWidgetConfig,
      };
    } catch (error) {
      logger.error("Failed to load MySQL store, falling back to file store", error);
      // Fall through to file store
    }
  }
  
  // File-based store (fallback or default)
  try {
    const store = await import("../storage/widgetConfigStore.js");
    return {
      getWidgetConfig: store.getWidgetConfig,
      updateWidgetConfig: store.upsertWidgetConfig,
    };
  } catch (error) {
    logger.error("Failed to load file-based store", error);
    throw new Error("Unable to load widget config store: " + error.message);
  }
}

router.get("/:projectId", async (req, res) => {
  const { projectId } = req.params;
  
  try {
    let config = null;
    try {
      const { getCachedConfig } = await import("../storage/redisCache.js");
      config = await getCachedConfig(projectId);
    } catch (error) {
      // Redis not available
    }
    
    if (!config) {
      const { getWidgetConfig } = await getConfigStore();
      config = await getWidgetConfig(projectId);
      
      try {
        const { setCachedConfig } = await import("../storage/redisCache.js");
        await setCachedConfig(projectId, config, 300);
      } catch (error) {
        // Redis not available
      }
    }

    if (config && config.agent_name) {
      const camelCaseConfig = {
        projectId: config.project_id || config.projectId,
        agentName: config.agent_name || config.agentName,
        avatarUrl: config.avatar_url || config.avatarUrl,
        primaryColor: config.primary_color || config.primaryColor,
        followupMessage: config.followup_message || config.followupMessage,
        bhkPrompt: config.bhk_prompt || config.bhkPrompt,
        inventoryMessage: config.inventory_message || config.inventoryMessage,
        phonePrompt: config.phone_prompt || config.phonePrompt,
        thankYouMessage: config.thank_you_message || config.thankYouMessage,
        bubblePosition: config.bubble_position || config.bubblePosition,
        autoOpenDelayMs: config.auto_open_delay_ms || config.autoOpenDelayMs,
        welcomeMessage: config.welcome_message || config.welcomeMessage,
        propertyInfo: config.property_info || config.propertyInfo || {},
      };
      return res.json(camelCaseConfig);
    }

    res.json(config || {});
  } catch (error) {
    logger.error("Failed to fetch widget config", error);
    res.status(200).json({
      projectId: projectId || req.params.projectId,
      agentName: 'Riya from Homesfy',
      avatarUrl: 'https://cdn.homesfy.com/assets/riya-avatar.png',
      primaryColor: '#6158ff',
      followupMessage: 'Sure… I\'ll send that across right away!',
      bhkPrompt: 'Which configuration you are looking for?',
      inventoryMessage: 'That\'s cool… we have inventory available with us.',
      phonePrompt: 'Please enter your mobile number...',
      thankYouMessage: 'Thanks! Our expert will call you shortly 📞',
      bubblePosition: 'bottom-right',
      autoOpenDelayMs: 4000,
      welcomeMessage: 'Hi, I\'m Riya from Homesfy 👋\nHow can I help you today?',
      propertyInfo: {}
    });
  }
});

router.post("/:projectId", requireApiKey, async (req, res) => {
  try {
    const { projectId } = req.params;
    const update = req.body;

    const { updateWidgetConfig } = await getConfigStore();
    const updatedConfig = await updateWidgetConfig(projectId, update);
    
    try {
      const { invalidateConfigCache } = await import("../storage/redisCache.js");
      await invalidateConfigCache(projectId);
    } catch (error) {
      // Redis not available
    }
    
    res.json(updatedConfig);
  } catch (error) {
    logger.error("Failed to update widget config", error);
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      message: "Widget config update failed",
      error: isDevelopment ? error.message : "Internal server error",
      stack: isDevelopment ? error.stack : undefined
    });
  }
});

export default router;


