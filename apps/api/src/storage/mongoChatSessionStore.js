import { connectMongoDB } from "../db/mongodb.js";
import { ChatSession } from "../models/ChatSession.js";

export async function createChatSession(data) {
  await connectMongoDB();
  const session = await ChatSession.create({
    microsite: data.microsite,
    projectId: data.projectId || data.microsite,
    leadId: data.leadId,
    phone: data.phone,
    bhkType: data.bhkType,
    conversation: data.conversation || [],
    metadata: data.metadata || {},
  });
  return session.toObject();
}

export async function listChatSessions(filters = {}) {
  await connectMongoDB();

  const query = ChatSession.find();

  if (filters.microsite) {
    query.where("microsite").equals(filters.microsite);
  }

  if (filters.leadId) {
    query.where("leadId").equals(filters.leadId);
  }

  const total = await ChatSession.countDocuments(query.getQuery());
  const items = await query
    .skip(Number(filters.skip) || 0)
    .limit(Number(filters.limit) || 50)
    .sort({ createdAt: -1 })
    .lean();

  return { items, total };
}

