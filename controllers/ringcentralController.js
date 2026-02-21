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
 📞 CALL CONTROLS
==================================================== */

// Answer call API (RingCentral)
exports.answerCall = async (req, res) => {
  try {
    const { callId, partyId } = req.body;

    // Validate input
    if (!callId || !partyId) {
      return res.status(400).json({
        success: false,
        message: "callId and partyId required"
      });
    }

    // Ensure SDK logged in
    const platform = rcsdk.platform();
    if (!platform.loggedIn()) {
      return res.status(401).json({
        success: false,
        message: "RingCentral not logged in"
      });
    }

    // Answer call
    await platform.post(
      `/restapi/v1.0/account/~/telephony/sessions/${callId}/parties/${partyId}/answer`
    );

    res.json({
      success: true,
      message: "Call answered successfully"
    });

  } catch (error) {
    console.error("Answer call error:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
};



// HANGUP
exports.hangupCall = async (req, res) => {
  try {
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({
        success: false,
        message: "callId required"
      });
    }

    // Get active party info
    const { platform, partyId } = await getActiveParty(callId);

    if (!platform.loggedIn()) {
      return res.status(401).json({
        success: false,
        message: "RingCentral not logged in"
      });
    }

    // Hangup call
    await platform.delete(
      `/restapi/v1.0/account/~/telephony/sessions/${callId}/parties/${partyId}`
    );

    res.json({
      success: true,
      message: "Call ended successfully"
    });

  } catch (err) {
    console.error(
      "Hangup error:",
      err.response?.data || err.message
    );

    res.status(500).json({
      success: false,
      error: err.response?.data || err.message
    });
  }
};

// MUTE / UNMUTE CALL
exports.muteCall = async (req, res) => {
  try {
    const { callId, muted } = req.body;

    // Validation
    if (!callId || typeof muted !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "callId and muted (true/false) required"
      });
    }

    // Get active call party
    const { platform, partyId } = await getActiveParty(callId);

    if (!platform.loggedIn()) {
      return res.status(401).json({
        success: false,
        message: "RingCentral not logged in"
      });
    }

    // Patch call party
    await platform.patch(
      `/restapi/v1.0/account/~/telephony/sessions/${callId}/parties/${partyId}`,
      { muted }
    );

    res.json({
      success: true,
      muted,
      message: muted ? "Call muted" : "Call unmuted"
    });

  } catch (err) {
    console.error("Mute error:", err.response?.data || err.message);

    res.status(500).json({
      success: false,
      error: err.response?.data || err.message
    });
  }
};

// HOLD / RESUME CALL
exports.holdCall = async (req, res) => {
  try {
    const { callId, hold } = req.body;

    if (!callId || typeof hold !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "callId and hold(true/false) required"
      });
    }

    const { platform, partyId } = await getActiveParty(callId);

    // HOLD or UNHOLD endpoint
    const endpoint = hold
      ? `/restapi/v1.0/account/~/telephony/sessions/${callId}/parties/${partyId}/hold`
      : `/restapi/v1.0/account/~/telephony/sessions/${callId}/parties/${partyId}/unhold`;

    await platform.post(endpoint);

    res.json({
      success: true,
      hold,
      message: hold ? "Call placed on hold" : "Call resumed"
    });

  } catch (err) {
    console.error("Hold error:", err.response?.data || err.message);

    res.status(500).json({
      success: false,
      error: err.response?.data || err.message
    });
  }
};


// RECORD / STOP CALL RECORDING
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

    // STOP recording → requires recordingId normally
    // simplest way: pause recording (safe fallback)
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

exports.fetchPendingRecordings = fetchPendingRecordings;

