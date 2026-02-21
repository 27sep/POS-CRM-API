const mongoose = require("mongoose");

const CallLogSchema = new mongoose.Schema(
  {
    /* ===============================
       📞 BASIC CALL INFO
    =============================== */
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

    callerName: { type: String, trim: true, default: null },
    callerEmail: { type: String, lowercase: true, trim: true, default: null },
    customerId: { type: String, index: true, default: null },

    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: null },
    duration: { type: Number, default: 0 },
    result: { type: String, default: null },

    status: {
      type: String,
      enum: ["ringing", "active", "ended"],
      default: "ended",
      index: true,
    },

    /* ===============================
       🎙 RECORDING INFO
    =============================== */
    recordingUrl: { type: String, default: null },
    recordingId: {
      type: String,
      index: true,
      sparse: true,
      default: null,
    },

    recordingFetchAttempts: { type: Number, default: 0 },

    /* ===============================
       🤖 AI / RINGSENSE DATA
    =============================== */
    transcript: { type: String, default: "" },
    aiSummary: { type: String, default: "" },
    aiScore: { type: Number, default: 0 },
    highlights: { type: [String], default: [] },
    callNotes: { type: String, default: "" },

    insightsStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },

    insightsFetchAttempts: { type: Number, default: 0 },
    insightsLastFetch: { type: Date, default: null },

    /* ===============================
       🧾 POLICY / SALES INFO
    =============================== */
    policyId: { type: String, index: true, trim: true, default: null },
    sourceCallId: { type: String, trim: true, default: null },
    policyNumber: { type: String, trim: true, default: null },
    beneficiaryName: { type: String, trim: true, default: null },
    issueDate: { type: Date, default: null },
    cancelDate: { type: Date, default: null },
    cancelReason: { type: String, trim: true, default: null },

    dealStatus: {
      type: String,
      enum: ["Active", "Pending", "Cancelled"],
      default: null,
      index: true,
    },

    replacement: {
      type: String,
      enum: ["Yes", "No"],
      default: null,
    },

    carrierSold: { type: String, trim: true, default: null },
    productName: { type: String, trim: true, default: null },
    carrierProduct: { type: String, trim: true, default: null },
    saleMadeBy: { type: String, trim: true, default: null },

    pendingRequirements: { type: String, default: "" },
    overallStatus: { type: String, default: null },

    /* ===============================
       💰 COMMISSION INFO
    =============================== */
    currentMonthlyPremium: { type: Number, default: 0 },
    newMonthlyPremium: { type: Number, default: 0 },
    annualPremium: { type: Number, default: 0 },
    compPercent: { type: Number, default: 0 },
    grossCommission: { type: Number, default: 0 },

    commissionStatus: {
      type: String,
      enum: ["Paid", "Pending", "Canceled"],
      default: "Pending",
      index: true,
    },

    monthsInForce: { type: Number, default: 0 },

    /* ===============================
       📞 RINGCENTRAL META
    =============================== */
    ringcentralSessionId: { type: String, index: true, default: null },
    ringcentralPartyId: { type: String, default: null },

    /* ===============================
       🧾 RAW PAYLOAD
    =============================== */
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("CallLog", CallLogSchema);
