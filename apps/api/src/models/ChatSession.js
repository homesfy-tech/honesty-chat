import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
  {
    microsite: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: String,
    },
    leadId: {
      type: String,
      required: true,
      index: true,
    },
    phone: {
      type: String,
    },
    bhkType: {
      type: String,
    },
    conversation: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const ChatSession = mongoose.model("ChatSession", chatSessionSchema);


