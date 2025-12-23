import express from "express";
import { config } from "../config.js";
import { normalizePhone } from "../utils/phoneValidation.js";
import { sanitizeMetadata, sanitizeConversation, sanitizeMicrosite } from "../utils/sanitize.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Helper functions to get the right storage modules
async function getLeadStore() {
  const storageType = config.dataStore;
  
  // Log which storage is being used (only first time)
  if (!getLeadStore._logged) {
    const { logger } = await import("../utils/logger.js");
    logger.log(`📦 Lead Storage: ${storageType === "mysql" ? "✅ MySQL Database" : "📁 File Storage"}`);
    logger.log(`   Config dataStore: ${storageType}`);
    logger.log(`   MYSQL_HOST: ${process.env.MYSQL_HOST ? "✅ Set" : "❌ Not set"}`);
    logger.log(`   MYSQL_USER: ${process.env.MYSQL_USER ? "✅ Set" : "❌ Not set"}`);
    getLeadStore._logged = true;
  }
  
  if (storageType === "mysql") {
    return await import("../storage/mysqlLeadStore.js");
  } else {
    return await import("../storage/leadStore.js");
  }
}

async function getEventStore() {
  if (config.dataStore === "mysql") {
    return await import("../storage/mysqlEventStore.js");
  } else {
    return await import("../storage/eventStore.js");
  }
}

async function getSessionStore() {
  if (config.dataStore === "mysql") {
    return await import("../storage/mysqlChatSessionStore.js");
  } else {
    return await import("../storage/chatSessionStore.js");
  }
}

const SPECIAL_BHK_MAPPINGS = new Map([
  ["duplex", { type: "Duplex", numeric: null }],
  ["justbrowsing", { type: "Just Browsing", numeric: null }],
  ["justlooking", { type: "Just Browsing", numeric: null }],
  ["other", { type: "Other", numeric: null }],
  ["yettodecide", { type: "Yet to decide", numeric: null }],
]);

function normalizeKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeBhkPreference({ bhk, bhkType }) {
  if (bhk !== undefined && bhk !== null && bhk !== "") {
    const numericValue = Number(bhk);

    if (Number.isFinite(numericValue)) {
      if (numericValue === 0) {
        return { type: "Yet to decide", numeric: null };
      }

      const rounded = Math.round(numericValue);
      if (rounded >= 1 && rounded <= 4) {
        return { type: `${rounded} BHK`, numeric: rounded };
      }

      return { type: "Other", numeric: rounded };
    }
  }

  if (bhkType !== undefined && bhkType !== null && bhkType !== "") {
    const trimmed = String(bhkType).trim();
    if (!trimmed) {
      return null;
    }

    const compactKey = normalizeKey(trimmed);

    if (SPECIAL_BHK_MAPPINGS.has(compactKey)) {
      return SPECIAL_BHK_MAPPINGS.get(compactKey);
    }

    const digitsMatch = trimmed.match(/(\d+)/);
    if (digitsMatch) {
      const numeric = Number(digitsMatch[1]);
      if (Number.isFinite(numeric)) {
        if (numeric === 0) {
          return { type: "Yet to decide", numeric: null };
        }
        if (numeric >= 1 && numeric <= 4) {
          return { type: `${numeric} BHK`, numeric };
        }
        return { type: "Other", numeric };
      }
    }
  }

  return null;
}

router.post("/", async (req, res) => {
  try {
    let { phone, bhk, bhkType, microsite, metadata, conversation } = req.body;

    // Sanitize inputs
    microsite = sanitizeMicrosite(microsite);
    if (!microsite) {
      return res.status(400).json({ message: "Missing or invalid microsite" });
    }

    // Sanitize metadata and conversation
    metadata = sanitizeMetadata(metadata);
    conversation = sanitizeConversation(conversation);

    const normalizedBhk = normalizeBhkPreference({ bhk, bhkType });

    if (!normalizedBhk) {
      return res
        .status(400)
        .json({ message: "Invalid or missing BHK preference" });
    }

    const sanitizedPhone =
      typeof phone === "string" && phone.trim().length > 0
        ? phone.trim()
        : undefined;

    let normalizedPhoneResult = null;
    if (sanitizedPhone) {
      normalizedPhoneResult = normalizePhone(sanitizedPhone);
      if (normalizedPhoneResult.error) {
        return res.status(400).json({ message: normalizedPhoneResult.error });
      }
    }

    const normalizedPhone = normalizedPhoneResult?.value;
    let metadataPayload =
      metadata && typeof metadata === "object" ? { ...metadata } : undefined;

    if (normalizedPhoneResult && metadataPayload) {
      metadataPayload.phoneCountry =
        metadataPayload.phoneCountry ??
        normalizedPhoneResult.country?.name ??
        metadataPayload.phoneCountry;
      metadataPayload.phoneCountryCode =
        metadataPayload.phoneCountryCode ??
        normalizedPhoneResult.country?.countryCode ??
        metadataPayload.phoneCountryCode;
      metadataPayload.phoneDialCode =
        metadataPayload.phoneDialCode ??
        normalizedPhoneResult.country?.code ??
        metadataPayload.phoneDialCode;
      metadataPayload.phoneSubscriber =
        metadataPayload.phoneSubscriber ??
        normalizedPhoneResult.subscriber ??
        metadataPayload.phoneSubscriber;
    } else if (normalizedPhoneResult && !metadataPayload) {
      metadataPayload = {
        phoneCountry: normalizedPhoneResult.country?.name,
        phoneCountryCode: normalizedPhoneResult.country?.countryCode,
        phoneDialCode: normalizedPhoneResult.country?.code,
        phoneSubscriber: normalizedPhoneResult.subscriber,
      };
    }

    // Extract location from metadata if available
    const location = metadataPayload?.location || metadataPayload?.visitor?.location || req.body.location || null;
    
    const leadStore = await getLeadStore();
    const sessionStore = await getSessionStore();
    const eventStore = await getEventStore();

    const lead = await leadStore.createLead({
      phone: normalizedPhone,
      bhk: normalizedBhk.numeric,
      bhkType: normalizedBhk.type,
      microsite,
      metadata: metadataPayload,
      conversation,
      location,
    });

    // Get lead ID (MySQL uses id, file storage uses id)
    const leadId = lead.id;

    try {
      await sessionStore.createChatSession({
        microsite,
        projectId: metadataPayload?.projectId || metadata?.projectId,
        leadId: leadId,
        phone: normalizedPhone ?? sanitizedPhone,
        bhkType: normalizedBhk.type,
        conversation,
        metadata: metadataPayload,
        location,
      });
    } catch (error) {
      logger.error("Failed to store chat session", error);
    }

    req.io?.to(microsite).emit("lead:new", lead);

    await eventStore.recordEvent({
      type: "lead_submitted",
      projectId: microsite,
      microsite,
      payload: {
        leadId: leadId,
        bhkType: normalizedBhk.type,
        ...(normalizedBhk.numeric !== null &&
          normalizedBhk.numeric !== undefined && { bhk: normalizedBhk.numeric }),
      },
      location,
    });

    res.status(201).json({ message: "Lead created", lead });
  } catch (error) {
    logger.error("Failed to create lead", error);
    res.status(500).json({ message: "Failed to create lead" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { microsite, search, startDate, endDate, limit = 50, skip = 0 } =
      req.query;
    
    logger.log("📋 GET /leads request:", {
      microsite,
      search,
      startDate: startDate ? new Date(startDate).toISOString() : "None (all time)",
      endDate: endDate ? new Date(endDate).toISOString() : "None (all time)",
      dateRange: startDate && endDate 
        ? `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
        : "All time",
      limit,
      skip,
    });
    
    const leadStore = await getLeadStore();
    const { items, total } = await leadStore.listLeads({
      microsite,
      search,
      startDate,
      endDate,
      limit,
      skip,
    });

    logger.log("✅ GET /leads response:", {
      itemsCount: Array.isArray(items) ? items.length : "not an array",
      total: total,
      hasItems: Array.isArray(items) && items.length > 0,
      firstItem: Array.isArray(items) && items.length > 0 ? {
        id: items[0].id || items[0]._id,
        phone: items[0].phone,
        microsite: items[0].microsite,
      } : null,
    });

    res.json({ items, total });
  } catch (error) {
    logger.error("Failed to list leads", error);
    res.status(500).json({ message: "Failed to list leads" });
  }
});

export default router;


