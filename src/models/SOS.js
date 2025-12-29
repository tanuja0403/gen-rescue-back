const mongoose = require("mongoose");

const sosSchema = new mongoose.Schema(
  {
    // Session & Identity
    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    // SOS Type
    sosType: {
      type: String,
      enum: ["voice", "text", "photo"],
      required: true,
    },

    // Location Data
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      accuracy: Number,
      capturedAt: Date,
    },

    // Original Data
    originalData: {
      voiceFileUrl: String,
      textMessage: String,
      photoUrl: String,
    },

    // AI Processing Results
    transcript: {
      type: String,
      default: null,
    },

    aiAnalysis: {
      urgency: {
        type: String,
        enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
        default: "MEDIUM",
      },
      summary: String,
      eventType: String,
      injuryStatus: String,
      riskFactors: [String],
      needs: [String],
      confidence: {
        type: Number,
        min: 0,
        max: 1,
      },
    },

    // Validation & Safety
    validationFlags: {
      hasKeywords: Boolean,
      meetsThreshold: Boolean,
      manualReview: {
        type: Boolean,
        default: false,
      },
    },

    // Status Tracking
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "processed",
        "failed",
        "assigned",
        "resolved",
      ],
      default: "pending",
    },

    processingErrors: [String],

    // Timestamps
    receivedAt: {
      type: Date,
      default: Date.now,
    },

    processedAt: Date,

    // Rescuer Assignment
    assignedTo: {
      type: String,
      default: null,
    },
    assignedAt: Date,

    // Resolution
    resolvedAt: Date,
    resolutionNotes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
sosSchema.index({ status: 1, "aiAnalysis.urgency": -1 });
sosSchema.index({ receivedAt: -1 });
sosSchema.index({ "location.latitude": 1, "location.longitude": 1 });

// Virtual for time elapsed
sosSchema.virtual("timeElapsed").get(function () {
  return Date.now() - this.receivedAt.getTime();
});

// Method to check if SOS is stale (over 24 hours)
sosSchema.methods.isStale = function () {
  const hoursElapsed = this.timeElapsed / (1000 * 60 * 60);
  return hoursElapsed > 24;
};

module.exports = mongoose.model("SOS", sosSchema);
