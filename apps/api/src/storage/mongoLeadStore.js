import { connectMongoDB } from "../db/mongodb.js";
import { Lead } from "../models/Lead.js";

export async function createLead(data) {
  await connectMongoDB();
  const lead = await Lead.create({
    phone: data.phone,
    bhk: data.bhk,
    bhkType: data.bhkType,
    microsite: data.microsite,
    metadata: data.metadata || {},
    conversation: data.conversation || [],
  });
  return lead.toObject();
}

export async function listLeads(filters = {}) {
  await connectMongoDB();

  const query = Lead.find();

  if (filters.microsite) {
    query.where("microsite").equals(filters.microsite);
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search, "i");
    query.or([
      { microsite: searchRegex },
      { phone: searchRegex },
      { "metadata.visitor.utm.source": searchRegex },
      { "metadata.visitor.utm.campaign": searchRegex },
    ]);
  }

  if (filters.startDate || filters.endDate) {
    const dateFilter = {};
    if (filters.startDate) {
      dateFilter.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      dateFilter.$lte = new Date(filters.endDate);
    }
    query.where("createdAt", dateFilter);
  }

  const total = await Lead.countDocuments(query.getQuery());
  const items = await query
    .skip(Number(filters.skip) || 0)
    .limit(Number(filters.limit) || 50)
    .sort({ createdAt: -1 })
    .lean();

  return { items, total };
}

