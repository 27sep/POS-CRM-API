const {
  getInboundCallLogs,
  getOutboundCallLogs,
} = require("../services/ringcentralService");
const { getPlatform } = require("../config/ringcentral");
const CallLog = require("../models/CallLog");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ====================================================
 🔧 HELPERS
==================================================== */

// Normalize phone numbers
const normalizeNumber = (num) => (num ? num.replace(/\D/g, "") : "");

// Date range helper
function getDateRange(dateRange) {
  let dateFrom = null;
  let dateTo = new Date().toISOString();

  if (dateRange === "7days") {
    dateFrom = new Date(Date.now() - 7 * 86400000).toISOString();
  } else if (dateRange === "1month") {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    dateFrom = d.toISOString();
  } else if (dateRange === "1year") {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    dateFrom = d.toISOString();
  } else if (dateRange === "all") {
    dateFrom = null;
    dateTo = null;
  }

  return { dateFrom, dateTo };
}

/* ====================================================
 📥 INBOUND SUMMARY
==================================================== */
exports.fetchInboundSummary = async (req, res, returnRaw = false) => {
  try {
    const { dateFrom, dateTo } = getDateRange(req.query.dateRange);

    const calls = await getInboundCallLogs({ dateFrom, dateTo }) || [];

    // Save calls to DB
    await saveCallsToDB(calls, "Inbound");

    const role = req.user?.role;
    const assignedNumbers = req.user?.assigned_numbers || [];
    const normalizedAssigned = assignedNumbers.map(normalizeNumber);

    let filtered = calls;

    if (role !== "admin") {
      filtered = calls.filter(
        (c) =>
          normalizedAssigned.includes(normalizeNumber(c.fromNumber)) ||
          normalizedAssigned.includes(normalizeNumber(c.toNumber))
      );
    }

    const summary = {};

    for (const call of filtered) {
      const key = call.fromNumber || "Unknown";

      if (!summary[key]) {
        summary[key] = {
          fromNumber: key,
          totalCalls: 0,
          missedCalls: 0,
          totalDuration: 0,
          callDetails: [],
        };
      }

      summary[key].totalCalls++;
      summary[key].totalDuration += call.duration || 0;

      if (call.result?.toLowerCase().includes("missed")) {
        summary[key].missedCalls++;
      }

      summary[key].callDetails.push(call);
    }

    const response = {
      success: true,
      totalInboundCalls: filtered.length,
      summary: Object.values(summary),
    };

    return returnRaw ? response : res.json(response);
  } catch (err) {
    console.error("Inbound Error:", err);
    return returnRaw
      ? { success: false, summary: [] }
      : res.status(500).json({
        success: false,
        message: "Inbound fetch failed",
      });
  }
};

/* ====================================================
 📤 OUTBOUND SUMMARY
==================================================== */
exports.fetchOutboundSummary = async (req, res, returnRaw = false) => {
  try {
    const { dateFrom, dateTo } = getDateRange(req.query.dateRange);

    const calls = await getOutboundCallLogs({ dateFrom, dateTo }) || [];

    await saveCallsToDB(calls, "Outbound");

    const role = req.user?.role;
    const assignedNumbers = req.user?.assigned_numbers || [];
    const normalizedAssigned = assignedNumbers.map(normalizeNumber);

    let filtered = calls;

    if (role !== "admin") {
      filtered = calls.filter(
        (c) =>
          normalizedAssigned.includes(normalizeNumber(c.fromNumber)) ||
          normalizedAssigned.includes(normalizeNumber(c.toNumber))
      );
    }

    const summary = {};

    for (const call of filtered) {
      const key = call.toNumber || "Unknown";

      if (!summary[key]) {
        summary[key] = {
          toNumber: key,
          totalCalls: 0,
          completedCalls: 0,
          totalDuration: 0,
          callDetails: [],
        };
      }

      summary[key].totalCalls++;
      summary[key].totalDuration += call.duration || 0;

      if (call.result?.toLowerCase().includes("completed")) {
        summary[key].completedCalls++;
      }

      summary[key].callDetails.push(call);
    }

    const response = {
      success: true,
      totalOutboundCalls: filtered.length,
      summary: Object.values(summary),
    };

    return returnRaw ? response : res.json(response);
  } catch (err) {
    console.error("Outbound Error:", err);
    return returnRaw
      ? { success: false, summary: [] }
      : res.status(500).json({
        success: false,
        message: "Outbound fetch failed",
      });
  }
};

/* ====================================================
 💾 SAVE CALLS TO DB
==================================================== */
async function saveCallsToDB(calls, direction) {
  if (!calls?.length) return;

  try {
    const ops = calls.map((call) => {
      const start = call.startTime ? new Date(call.startTime) : null;

      const status =
        call.result === "In Progress" ? "active" : "ended";

      return {
        updateOne: {
          filter: { callId: call.id },
          update: {
            $set: {
              callId: call.id,
              direction,
              fromNumber:
                call.fromNumber === "Unknown" ? null : call.fromNumber,
              toNumber:
                call.toNumber === "Unknown" ? null : call.toNumber,
              startTime: start,
              endTime:
                start && call.duration
                  ? new Date(start.getTime() + call.duration * 1000)
                  : null,
              duration: call.duration || 0,
              result: call.result,
              status,
              rawPayload: call,
            },
          },
          upsert: true,
        },
      };
    });

    await CallLog.bulkWrite(ops, { ordered: false });

  } catch (error) {
    console.error("DB Save Error:", error.message);
  }
}

/* ====================================================
 🎙 FETCH RECORDING
==================================================== */
async function fetchRecording(callId, retry = 0) {
  try {
    const platform = getPlatform();

    // STEP 1: Get call log
    const callLogRes = await platform.get(
      `/restapi/v1.0/account/~/extension/~/call-log/${callId}`
    );

    const callLog = await callLogRes.json();

    if (!callLog?.recording?.id) {
      console.log("❌ Recording not ready:", callId);
      return null;
    }

    // STEP 2: Get recording details
    const recRes = await platform.get(
      `/restapi/v1.0/account/~/recording/${callLog.recording.id}`
    );

    const recording = await recRes.json();

    console.log("✅ Recording Found:", recording.id);

    return recording;

  } catch (error) {
    // ⭐ Rate limit handling
    if (error.response?.status === 429 && retry < 3) {
      console.log("⏳ Rate limit, retry after 60s...");
      await delay(60000);
      return fetchRecording(callId, retry + 1);
    }

    console.error("Recording Error:", error.message);
    return null;
  }
}


/* ====================================================
 🎙 FETCH PENDING RECORDINGS
==================================================== */
async function fetchPendingRecordings() {
  const calls = await CallLog.find({
    recordingId: null,
    status: "ended",
    recordingFetchAttempts: { $lt: 5 },
  })
    .sort({ createdAt: -1 })
    .limit(5);

  for (const call of calls) {
    try {
      console.log("📞 Checking call:", call.callId);

      const recording = await fetchRecording(call.callId);

      if (!recording) {
        await CallLog.updateOne(
          { callId: call.callId },
          { $inc: { recordingFetchAttempts: 1 } }
        );
        continue;
      }

      await CallLog.updateOne(
        { callId: call.callId },
        {
          $set: {
            recordingId: recording.id,
            recordingUrl: recording.contentUri,
            insightsStatus: "pending",
          },
        }
      );

      await updateInsights({
        callId: call.callId,
        recordingId: recording.id,
      });

      await delay(15000);

    } catch (err) {
      console.error("Pending Recording Error:", err.message);
    }
  }
}

/* ====================================================
 🎙 fetchRingSenseInsights
==================================================== */
async function fetchRingSenseInsights(recordingId) {
  try {
    const platform = getPlatform();

    const res = await platform.get(
      `/ai/ringsense/v1/public/accounts/~/domains/phone/records/${recordingId}/insights`,
      {
        params: {
          insightTypes:
            "Transcript,Summary,Highlights,AIScore,CallNotes",
        },
      }
    );

    const data = await res.json();

    console.log("===== RINGSENSE RESPONSE =====");
    console.dir(data, { depth: null });
    console.log("==============================");

    return data;

  } catch (err) {
    if (err.response?.status === 404) {
      console.log("⏳ Insights processing...");
      return null;
    }

    console.error("RingSense Error:", err.message);
    return null;
  }
}

/* ====================================================
 🎙 updateInsights
==================================================== */
async function updateInsights(call) {
  try {
    if (!call?.recordingId) return;

    const existing = await CallLog.findOne({ callId: call.callId });

    if (
      !existing ||
      existing.insightsStatus === "completed" ||
      existing.insightsFetchAttempts >= 5
    )
      return;

    const insights = await fetchRingSenseInsights(call.recordingId);

    if (!insights?.insights) {
      await CallLog.updateOne(
        { callId: call.callId },
        { $inc: { insightsFetchAttempts: 1 } }
      );
      return;
    }

    await CallLog.updateOne(
      { callId: call.callId },
      {
        $set: {
          transcript: insights.insights.Transcript || "",
          aiSummary: insights.insights.Summary || "",
          aiScore: insights.insights.AIScore || 0,
          highlights: insights.insights.Highlights || [],
          callNotes: insights.insights.CallNotes || "",
          insightsStatus: "completed",
          insightsLastFetch: new Date(),
        },
      }
    );

    console.log("✅ Insights saved");

  } catch (err) {
    console.error("Insights Update Error:", err.message);
  }
}

/* ====================================================
 🔥 FIXED: SIP INFO ENDPOINT (THIS IS THE ONLY ENDPOINT NEEDED FOR WEBRTC)
==================================================== */


// Helper function to clean up expired cache entries
function cleanupCache() {
  console.log("🧹 Cleaning up expired SIP cache entries...");
  const now = Date.now();
  let expiredCount = 0;
  
  for (const [key, value] of sipInfoCache.entries()) {
    if (value.expiresAt < now) {
      sipInfoCache.delete(key);
      expiredCount++;
    }
  }
  
  console.log(`✅ Removed ${expiredCount} expired cache entries`);
  console.log(`📊 Current cache size: ${sipInfoCache.size} entries`);
}
// Replace getSipInfo in your ringcentralController.js

const sipInfoCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour (not 20 — SIP creds can expire sooner)

exports.getSipInfo = async (req, res) => {
  try {
    console.log("📡 Getting SIP info for WebRTC...");

    const userId = req.user?.id || req.user?._id || req.ip || "anonymous";
    const forceRefresh = req.query.refresh === "true"; // Allow forced refresh

    // Check cache
    const cached = sipInfoCache.get(userId);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      console.log("✅ Returning CACHED SIP info for user:", userId);
      return res.json({
        success: true,
        sipInfo: cached.sipInfo,
        cached: true,
        expiresIn: Math.round((cached.expiresAt - Date.now()) / 1000 / 60) + " minutes",
      });
    }

    const platform = getPlatform();

    // Ensure token is valid
    const tokenValid = await platform.auth().accessTokenValid();
    if (!tokenValid) {
      console.log("🔄 Token expired, re-authenticating...");
      await platform.login({ jwt: process.env.RINGCENTRAL_JWT.trim() });
    }

    console.log("📡 Requesting SIP provision from RingCentral...");

    const response = await platform.post("/restapi/v1.0/client-info/sip-provision", {
      sipInfo: [{ transport: "WSS" }],
    });

    const data = await response.json();

    console.log("✅ SIP Provision response keys:", Object.keys(data));
    console.log("📱 Device:", data.device?.id, data.device?.type);
    console.log("📞 SIP entries:", data.sipInfo?.length);
    console.log("📞 First SIP transport:", data.sipInfo?.[0]?.transport);
    console.log("📞 First SIP domain:", data.sipInfo?.[0]?.domain);
    console.log("📞 First SIP outboundProxy:", data.sipInfo?.[0]?.outboundProxy);

    if (!data.sipInfo || data.sipInfo.length === 0) {
      throw new Error("RingCentral returned empty sipInfo array");
    }

    // Use WSS transport entry specifically
    const sipEntry = data.sipInfo.find((s) => s.transport === "WSS") || data.sipInfo[0];

    console.log("📞 Using SIP entry:", {
      transport: sipEntry.transport,
      domain: sipEntry.domain,
      username: sipEntry.username,
      outboundProxy: sipEntry.outboundProxy,
    });

    const sipInfo = {
      username: sipEntry.username,
      password: sipEntry.password,
      authorizationId: sipEntry.authorizationId || sipEntry.username,
      domain: sipEntry.domain,
      outboundProxy: sipEntry.outboundProxy,
      transport: sipEntry.transport || "WSS",
      deviceId: data.device?.id,
    };

    // Validate all required fields
    const missing = ["username", "password", "domain", "outboundProxy"].filter(
      (f) => !sipInfo[f]
    );
    if (missing.length > 0) {
      throw new Error(`SIP info missing required fields: ${missing.join(", ")}`);
    }

    // Cache it
    sipInfoCache.set(userId, {
      sipInfo,
      expiresAt: Date.now() + CACHE_DURATION,
      createdAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      sipInfo,
      cached: false,
      expiresIn: Math.round(CACHE_DURATION / 1000 / 60) + " minutes",
    });

  } catch (error) {
    console.error("❌ SIP Provision failed:", error.message);

    const userId = req.user?.id || req.user?._id || req.ip || "anonymous";

    // Rate limit — try expired cache as fallback
    if (error.response?.status === 429) {
      const cached = sipInfoCache.get(userId);
      if (cached) {
        console.log("⚠️ Rate limited — using expired cache as fallback");
        return res.json({
          success: true,
          sipInfo: cached.sipInfo,
          cached: true,
          expired: true,
          message: "Using cached credentials (rate limited)",
        });
      }
      return res.status(429).json({
        success: false,
        error: "Rate limited by RingCentral. Please wait and try again.",
      });
    }

    let errorData = error.message;
    try {
      if (error.response) errorData = await error.response.json();
    } catch (_) {}

    // Clear bad cache entry on error
    sipInfoCache.delete(userId);

    return res.status(500).json({ success: false, error: errorData });
  }
};
/* ====================================================
 🗑️ REMOVED: All call control endpoints (answer, hangup, mute, hold)
 These are handled by WebRTC directly in the browser
==================================================== */

// ✅ KEEP ONLY: Recording endpoint (optional - can be handled by WebRTC too)
exports.recordCall = async (req, res) => {
  try {
    const { callId, recording } = req.body;

    if (!callId) {
      return res.status(400).json({
        success: false,
        message: "callId required"
      });
    }

    const { platform, partyId } = await getActiveParty(callId);

    if (recording) {
      // START recording
      await platform.post(
        `/restapi/v1.0/account/~/telephony/sessions/${callId}/parties/${partyId}/recordings`
      );

      return res.json({
        success: true,
        recording: true,
        message: "Recording started"
      });
    }

    // STOP recording
    await platform.patch(
      `/restapi/v1.0/account/~/telephony/sessions/${callId}/parties/${partyId}/recordings`,
      { active: false }
    );

    res.json({
      success: true,
      recording: false,
      message: "Recording stopped"
    });

  } catch (err) {
    console.error("Recording error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data || err.message
    });
  }
};

// Helper function for getting active party (kept for recording)
async function getActiveParty(callId) {
  const platform = getPlatform();

  const tokenValid = await platform.auth().accessTokenValid();
  if (!tokenValid) {
    throw new Error("RingCentral not logged in or token expired");
  }

  const res = await platform.get(
    `/restapi/v1.0/account/~/telephony/sessions/${callId}`
  );

  const session = await res.json();

  if (!session?.parties?.length) {
    throw new Error("No active parties found");
  }

  const activeParty = session.parties.find(
    (p) =>
      ["Setup", "Proceeding", "Answered", "Connected", "OnHold"].includes(
        p.status?.code
      )
  );

  if (!activeParty) {
    throw new Error("No active party found");
  }

  return {
    platform,
    partyId: activeParty.id,
  };
}

exports.fetchPendingRecordings = fetchPendingRecordings;