import crypto from "crypto";
import { readJson, writeJson } from "./fileStore.js";

const FILE_NAME = "events.json";
const DEFAULT_STORE = { events: [] };

async function loadStore() {
  return readJson(FILE_NAME, DEFAULT_STORE);
}

async function saveStore(store) {
  await writeJson(FILE_NAME, store);
}

export async function recordEvent({ type, projectId, microsite, payload }) {
  const now = new Date().toISOString();
  const event = {
    id: crypto.randomUUID(),
    type,
    projectId,
    microsite,
    payload,
    createdAt: now,
  };

  const store = await loadStore();
  store.events = [event, ...store.events];
  await saveStore(store);
  return event;
}

export async function getEventSummary() {
  const store = await loadStore();

  const summary = store.events.reduce(
    (acc, event) => {
      if (event.type === "chat_shown") acc.chatsShown += 1;
      if (event.type === "chat_started") acc.chatsStarted += 1;
      if (event.type === "lead_submitted") acc.leadsCaptured += 1;
      return acc;
    },
    { chatsShown: 0, chatsStarted: 0, leadsCaptured: 0 }
  );

  return summary;
}


