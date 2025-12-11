import express from "express";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Helper function to get the right storage module
async function getEventStore() {
  if (config.dataStore === "postgresql") {
    return await import("../storage/postgresEventStore.js");
  } else {
    return await import("../storage/eventStore.js");
  }
}

router.post("/", async (req, res) => {
  try {
    // Handle both JSON body and FormData (from sendBeacon blob)
    let bodyData = req.body;
    
    // If body is a string (from sendBeacon blob), parse it
    if (typeof bodyData === 'string' || Buffer.isBuffer(bodyData)) {
      try {
        bodyData = JSON.parse(bodyData.toString());
      } catch (parseError) {
        logger.warn("Events API: Failed to parse body as JSON", parseError);
        return res.status(400).json({ message: "Invalid request body" });
      }
    }
    
    // Handle empty body or FormData
    if (!bodyData || Object.keys(bodyData).length === 0) {
      // Try to read from raw body if available
      if (req.body && typeof req.body === 'string') {
        try {
          bodyData = JSON.parse(req.body);
        } catch (e) {
          return res.status(400).json({ message: "Invalid request body" });
        }
      } else {
        return res.status(400).json({ message: "Request body is required" });
      }
    }

    const { type, projectId, microsite, payload } = bodyData;

    if (!type || !projectId) {
      return res.status(400).json({ message: "type and projectId required" });
    }

    const eventStore = await getEventStore();
    
    // Extract location from payload if available
    const location = payload?.location || bodyData.location || null;
    
    const event = await eventStore.recordEvent({ 
      type, 
      projectId, 
      microsite, 
      payload: payload || bodyData.payload || {},
      location
    });
    res.status(201).json({ message: "Event recorded", event });
  } catch (error) {
    logger.error("Failed to record event", error);
    // Return 200 instead of 500 to prevent widget errors - events are not critical
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(200).json({ message: "Event recording failed (non-critical)", error: isDevelopment ? error.message : undefined });
  }
});

router.get("/", async (_req, res) => {
  try {
    const eventStore = await getEventStore();
    const summary = await eventStore.getEventSummary();

    res.json(summary);
  } catch (error) {
    logger.error("Failed to fetch events summary", error);
    res.status(500).json({ message: "Failed to fetch events summary" });
  }
});

export default router;


