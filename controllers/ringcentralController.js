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

      return {
        updateOne: {
          filter: { callId: call.id },
          update: {
            $set: {
              callId: call.id,
              direction,
              fromNumber: call.fromNumber === "Unknown" ? null : call.fromNumber,
              toNumber: call.toNumber === "Unknown" ? null : call.toNumber,
              startTime: start,
              endTime:
                start && call.duration
                  ? new Date(start.getTime() + call.duration * 1000)
                  : null,
              duration: call.duration || 0,
              result: call.result,
              status: "ended",
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
  })
    .sort({ createdAt: -1 })
    .limit(5);

  for (const call of calls) {
    try {
      console.log("📞 Checking call:", call.callId);

      const recording = await fetchRecording(call.callId);

      if (!recording) {
        console.log("❌ Recording not ready yet:", call.callId);
        continue;
      }

      // Save recording
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

      console.log("✅ Recording saved:", recording.id);

      // ⭐ FETCH AI INSIGHTS AFTER RECORDING SAVE
      await updateInsights({
        callId: call.callId,
        recordingId: recording.id,
      });

      // ⭐ Avoid RingCentral rate limit
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

    if (!existing || existing.insightsStatus === "completed")
      return;

    console.log("🎙 Fetching insights for:", call.recordingId);

    const insights = await fetchRingSenseInsights(call.recordingId);

    if (!insights?.insights) {
      console.log("❌ No insights yet:", call.recordingId);
      return;
    }

    console.log("📝 Transcript:", insights.insights.Transcript);
    console.log("📊 Score:", insights.insights.AIScore);

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

// ANSWER
exports.answerCall = async (req, res) => {
  try {
    const { callId } = req.body;
    const { platform, partyId } = await getActiveParty(callId);

    await platform.post(
      `/restapi/v1.0/account/~/telephony/sessions/${callId}/parties/${partyId}/answer`
    );

    res.json({ success: true, message: "Call answered" });
  } catch (err) {
    console.error("Answer error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// HANGUP
exports.hangupCall = async (req, res) => {
  try {
    const { callId } = req.body;
    const { platform, partyId } = await getActiveParty(callId);

    await platform.delete(
      `/restapi/v1.0/account/~/telephony/sessions/${callId}/parties/${partyId}`
    );

    res.json({ success: true, message: "Call ended" });
  } catch (err) {
    console.error("Hangup error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// MUTE / UNMUTE
exports.muteCall = async (req, res) => {
  try {
    const { callId, muted } = req.body;
    const { platform, partyId } = await getActiveParty(callId);

    await platform.patch(
      `/restapi/v1.0/account/~/telephony/sessions/${callId}/parties/${partyId}`,
      { muted }
    );

    res.json({ success: true, muted });
  } catch (err) {
    console.error("Mute error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// HOLD / RESUME
exports.holdCall = async (req, res) => {
  try {
    const { callId, hold } = req.body;
    const { platform, partyId } = await getActiveParty(callId);

    await platform.patch(
      `/restapi/v1.0/account/~/telephony/sessions/${callId}/parties/${partyId}`,
      { hold }
    );

    res.json({ success: true, hold });
  } catch (err) {
    console.error("Hold error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// RECORD / STOP
exports.recordCall = async (req, res) => {
  try {
    const { callId, recording } = req.body;
    const { platform, partyId } = await getActiveParty(callId);

    await platform.patch(
      `/restapi/v1.0/account/~/telephony/sessions/${callId}/parties/${partyId}`,
      { recording }
    );

    res.json({ success: true, recording });
  } catch (err) {
    console.error("Record error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.fetchPendingRecordings = fetchPendingRecordings;

