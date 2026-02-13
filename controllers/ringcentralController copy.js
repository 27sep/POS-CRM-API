const {
  getInboundCallLogs,
  getOutboundCallLogs,
} = require("../services/ringcentralService");
const { getPlatform } = require("../config/ringcentral");
const CallLog = require("../models/CallLog");

/* ====================================================
 🔧 HELPERS
==================================================== */

// Normalize phone numbers
const normalizeNumber = (num) => (num ? num.replace(/\D/g, "") : "");

// Get active party from session
async function getActiveParty(sessionId) {
  const platform = getPlatform();

  const res = await platform.get(
    `/restapi/v1.0/account/~/telephony/sessions/${sessionId}`
  );

  const data = await res.json();
  const party = data.parties?.find(
    (p) => p.status?.code !== "Disconnected"
  );

  if (!party) throw new Error("Active party not found");

  return { platform, partyId: party.id };
}

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
 📥 INBOUND SUMMARY (ROLE BASED)
==================================================== */
exports.fetchInboundSummary = async (req, res, returnRaw = false) => {
  try {
    const { dateFrom, dateTo } = getDateRange(req.query.dateRange);
    const calls = (await getInboundCallLogs({ dateFrom, dateTo })) || [];
    // Save inbound calls
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
    console.error("❌ INBOUND ERROR:", err);
    return returnRaw
      ? { success: false, summary: [] }
      : res.status(500).json({ success: false, message: "Inbound fetch failed" });
  }
};

/* ====================================================
 📤 OUTBOUND SUMMARY (ROLE BASED)
==================================================== */
exports.fetchOutboundSummary = async (req, res, returnRaw = false) => {
  try {
    const { dateFrom, dateTo } = getDateRange(req.query.dateRange);
    const calls = (await getOutboundCallLogs({ dateFrom, dateTo })) || [];

    // Save outbound calls
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
    console.error("❌ OUTBOUND ERROR:", err);
    return returnRaw
      ? { success: false, summary: [] }
      : res.status(500).json({ success: false, message: "Outbound fetch failed" });
  }
};
/* ====================================================
 🔧 DB Save Helper
==================================================== */
async function saveCallsToDB(calls, direction) {
  if (!calls?.length) return;

  const ops = calls.map((call) => {
    const start = call.startTime ? new Date(call.startTime) : null;

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
            status: "ended",

            rawPayload: call,
          },
        },
        upsert: true,
      },
    };
  });

  await CallLog.bulkWrite(ops);
}
/* ====================================================
 🔧 fetchRecording
==================================================== */
async function fetchRecording(callId) {
  const platform = getPlatform();

  const res = await platform.get(
    `/restapi/v1.0/account/~/recording`,
    { callLogId: callId }
  );

  const data = await res.json();
  return data.records?.[0];
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
