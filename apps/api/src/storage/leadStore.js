import crypto from "crypto";
import { readJson, writeJson } from "./fileStore.js";

const FILE_NAME = "leads.json";
const DEFAULT_STORE = { leads: [] };

async function loadStore() {
  return readJson(FILE_NAME, DEFAULT_STORE);
}

async function saveStore(store) {
  await writeJson(FILE_NAME, store);
}

export async function createLead({
  phone,
  bhk,
  bhkType,
  microsite,
  metadata = {},
  conversation = [],
}) {
  const now = new Date().toISOString();
  const lead = {
    id: crypto.randomUUID(),
    phone,
    bhk,
    bhkType,
    microsite,
    leadSource: "ChatWidget",
    status: "new",
    metadata,
    conversation,
    createdAt: now,
    updatedAt: now,
  };

  const store = await loadStore();
  store.leads = [lead, ...store.leads];
  await saveStore(store);
  return lead;
}

export async function listLeads({
  microsite,
  search,
  startDate,
  endDate,
  limit = 50,
  skip = 0,
} = {}) {
  const store = await loadStore();
  let collection = store.leads;

  if (microsite) {
    collection = collection.filter((lead) => lead.microsite === microsite);
  }

  if (search) {
    const normalized = String(search).trim().toLowerCase();

    if (normalized) {
      collection = collection.filter((lead) => {
        const micrositeMatch = lead.microsite
          ?.toLowerCase()
          .includes(normalized);
        const phoneMatch = lead.phone
          ? String(lead.phone).toLowerCase().includes(normalized)
          : false;
        const utmSource = lead.metadata?.visitor?.utm?.source;
        const utmCampaign = lead.metadata?.visitor?.utm?.campaign;

        const sourceMatch = utmSource
          ?.toLowerCase()
          .includes(normalized);
        const campaignMatch = utmCampaign
          ?.toLowerCase()
          .includes(normalized);

        return micrositeMatch || phoneMatch || sourceMatch || campaignMatch;
      });
    }
  }

  if (startDate || endDate) {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    collection = collection.filter((lead) => {
      if (!lead.createdAt) return false;
      const created = new Date(lead.createdAt);

      if (Number.isNaN(created.getTime())) {
        return false;
      }

      const afterStart = start ? created >= start : true;
      const beforeEnd = end ? created <= end : true;

      return afterStart && beforeEnd;
    });
  }

  const total = collection.length;
  const items = collection.slice(Number(skip), Number(skip) + Number(limit));

  return { items, total };
}


