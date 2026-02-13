const mongoose = require("mongoose");

const CallLogSchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    direction: {
      type: String,
      enum: ["Inbound", "Outbound"],
      required: true,
      index: true,
    },

    fromNumber: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },

    toNumber: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },

    callerName: {
      type: String,
      trim: true,
      default: null,
    },

    callerEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },

    customerId: {
      type: String,
      index: true,
      default: null,
    },

    startTime: {
      type: Date,
      required: true,
      index: true,
    },

    endTime: {
      type: Date,
      default: null,
    },

    duration: {
      type: Number,
      default: 0,
    },

    result: {
      type: String,
      default: null,
    },

    /* ===============================
       🎙 RECORDING INFO
    =============================== */
    recordingUrl: {
      type: String,
      default: null,
    },

    recordingId: {
      type: String,
      index: true,
      sparse: true,
      default: null,
    },

    /* ===============================
       🤖 AI / RINGSENSE DATA
    =============================== */
    transcript: {
      type: String,
      default: "",
    },

    aiSummary: {
      type: String,
      default: "",
    },

    aiScore: {
      type: Number,
      default: 0,
    },

    highlights: {
      type: [String],
      default: [],
    },

    callNotes: {
      type: String,
      default: "",
    },

    insightsStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },

    insightsLastFetch: {
      type: Date,
      default: null,
    },

    /* ===============================
       📞 RINGCENTRAL META
    =============================== */
    ringcentralSessionId: {
      type: String,
      index: true,
      default: null,
    },

    ringcentralPartyId: {
      type: String,
      default: null,
    },

    /* ===============================
       🧾 RAW PAYLOAD
    =============================== */
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    status: {
      type: String,
      enum: ["ringing", "active", "ended"],
      default: "ended",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("CallLog", CallLogSchema);
