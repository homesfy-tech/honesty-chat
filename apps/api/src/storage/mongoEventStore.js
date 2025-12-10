import { connectMongoDB } from "../db/mongodb.js";
import { Event } from "../models/Event.js";

export async function recordEvent(data) {
  await connectMongoDB();
  const event = await Event.create({
    type: data.type,
    projectId: data.projectId,
    microsite: data.microsite,
    payload: data.payload || {},
  });
  return event.toObject();
}

export async function getEventSummary() {
  await connectMongoDB();

  const [chatsShown, chatsStarted, leadsCaptured] = await Promise.all([
    Event.countDocuments({ type: "chat_shown" }),
    Event.countDocuments({ type: "chat_started" }),
    Event.countDocuments({ type: "lead_submitted" }),
  ]);

  return {
    chatsShown,
    chatsStarted,
    leadsCaptured,
  };
}

