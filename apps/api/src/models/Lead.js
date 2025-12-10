import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: false,
      index: true,
      sparse: true,
      trim: true,
    },
    bhkType: {
      type: String,
      enum: [
        "1 Bhk",
        "1 BHK",
        "2 Bhk",
        "2 BHK",
        "3 Bhk",
        "3 BHK",
        "4 Bhk",
        "4 BHK",
        "Duplex",
        "Just Browsing",
        "Other",
        "Yet to decide",
      ],
      required: true,
    },
    bhk: {
      type: Number,
      min: 0,
    },
    microsite: {
      type: String,
      required: true,
      index: true,
    },
    leadSource: {
      type: String,
      default: "ChatWidget",
    },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "closed"],
      default: "new",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    conversation: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ phone: 1, microsite: 1 }, { unique: false });

export const Lead = mongoose.model("Lead", leadSchema);


