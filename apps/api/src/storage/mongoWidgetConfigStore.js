import { connectMongoDB } from "../db/mongodb.js";
import { WidgetConfig } from "../models/WidgetConfig.js";

const DEFAULT_THEME = {
  agentName: "Riya from Homesfy",
  avatarUrl:
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzlzZ2R4b3J2OHJ2MjFpd3RiZW5sbmxwOHVzb3RrdmNmZTh5Z25mYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/g9582DNuQppxC/giphy.gif",
  primaryColor: "#6158ff",
  followupMessage: "Sure… I'll send that across right away!",
  bhkPrompt: "Which configuration you are looking for?",
  inventoryMessage: "That's cool… we have inventory available with us.",
  phonePrompt: "Please enter your mobile number...",
  thankYouMessage: "Thanks! Our expert will call you shortly 📞",
  bubblePosition: "bottom-right",
  autoOpenDelayMs: 4000,
  welcomeMessage: "Hi, I'm Riya from Homesfy 👋\nHow can I help you today?",
};

export async function getWidgetConfig(projectId) {
  await connectMongoDB();
  
  let config = await WidgetConfig.findOne({ projectId }).lean();
  
  if (!config) {
    // Create default config if it doesn't exist
    config = await WidgetConfig.create({
      projectId,
      ...DEFAULT_THEME,
    });
    return config.toObject();
  }
  
  return config;
}

export async function updateWidgetConfig(projectId, updates) {
  await connectMongoDB();
  
  const config = await WidgetConfig.findOneAndUpdate(
    { projectId },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  ).lean();
  
  return config;
}

export async function listWidgetConfigs() {
  await connectMongoDB();
  
  const configs = await WidgetConfig.find({}).lean();
  return configs;
}

