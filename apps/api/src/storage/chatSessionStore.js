import crypto from "crypto";
import { readJson, writeJson } from "./fileStore.js";

const FILE_NAME = "chat-sessions.json";
const DEFAULT_STORE = { sessions: [] };

async function loadStore() {
  return readJson(FILE_NAME, DEFAULT_STORE);
}

async function saveStore(store) {
  await writeJson(FILE_NAME, store);
}

export async function createChatSession({
  microsite,
  projectId,
  leadId,
  phone,
  bhkType,
  conversation = [],
  metadata = {},
}) {
  const now = new Date().toISOString();
  const session = {
    id: crypto.randomUUID(),
    microsite,
    projectId: projectId || microsite,
    leadId,
    phone,
    bhkType,
    conversation,
    metadata,
    createdAt: now,
    updatedAt: now,
  };

  const store = await loadStore();
  store.sessions = [session, ...store.sessions];
  await saveStore(store);

  return session;
}

export async function listChatSessions({
  microsite,
  leadId,
  limit = 50,
  skip = 0,
} = {}) {
  const store = await loadStore();
  let collection = store.sessions;

  if (microsite) {
    collection = collection.filter((session) => session.microsite === microsite);
  }

  if (leadId) {
    collection = collection.filter((session) => session.leadId === leadId);
  }

  const total = collection.length;
  const items = collection.slice(Number(skip), Number(skip) + Number(limit));

  return { items, total };
}


