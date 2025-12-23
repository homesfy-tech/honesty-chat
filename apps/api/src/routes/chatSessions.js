import express from "express";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Helper function to get the right storage module
async function getSessionStore() {
  if (config.dataStore === "mysql") {
    return await import("../storage/mysqlChatSessionStore.js");
  } else {
    return await import("../storage/chatSessionStore.js");
  }
}

router.get("/", async (req, res) => {
  try {
    const { microsite, leadId, limit, skip } = req.query;
    const sessionStore = await getSessionStore();
    const { items, total } = await sessionStore.listChatSessions({
      microsite,
      leadId,
      limit: limit ? parseInt(limit, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });

    res.json({ items, total });
  } catch (error) {
    logger.error("Failed to list chat sessions", error);
    res.status(500).json({ message: "Failed to list chat sessions", error: error.message });
  }
});

export default router;


