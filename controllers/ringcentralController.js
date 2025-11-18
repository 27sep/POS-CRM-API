const { getInboundCallLogs, getOutboundCallLogs } = require("../services/ringcentralService");

// Helper: normalize numbers by removing non-digits
const normalizeNumber = (num) => (num ? num.replace(/\D/g, "") : "");

/*
====================================================
 📥 INBOUND SUMMARY (Role Based)
====================================================
*/
exports.fetchInboundSummary = async (req, res, returnRaw = false) => {
  try {
    let { dateRange } = req.query;
    let dateFrom = null;
    let dateTo = new Date().toISOString();

    // Determine dateFrom based on dateRange
    if (dateRange === "7days") {
      dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (dateRange === "1month") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      dateFrom = d.toISOString();
    } else if (dateRange === "1year") {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      dateFrom = d.toISOString();
    } else if (dateRange === "all") {
      dateFrom = null; // fetch all
      dateTo = null;
    }

    const calls = (await getInboundCallLogs({ dateFrom, dateTo })) || [];
    console.log("RAW INBOUND CALLS:", calls);

    const role = req.user?.role;
    const assignedNumbers = req.user?.assigned_numbers || [];
    const normalizedAssigned = assignedNumbers.map(normalizeNumber);

    let filtered = calls;

    if (role !== "admin") {
      filtered = calls.filter(
        (call) =>
          normalizedAssigned.includes(normalizeNumber(call.fromNumber)) ||
          normalizedAssigned.includes(normalizeNumber(call.toNumber))
      );
    }

    const summary = {};

    for (const call of filtered) {
      const keyNumber = call.fromNumber || "Unknown";

      if (!summary[keyNumber]) {
        summary[keyNumber] = {
          fromNumber: keyNumber,
          totalCalls: 0,
          missedCalls: 0,
          totalDuration: 0,
          callDetails: [],
        };
      }

      summary[keyNumber].totalCalls++;
      summary[keyNumber].totalDuration += call.duration || 0;
      if (call.result?.toLowerCase().includes("missed")) summary[keyNumber].missedCalls++;
      summary[keyNumber].callDetails.push(call);
    }

    const response = {
      success: true,
      totalInboundCalls: filtered.length,
      summary: Object.values(summary),
    };

    if (returnRaw) return response;
    return res.json(response);
  } catch (error) {
    console.error("❌ INBOUND ERROR:", error);
    if (returnRaw) return { success: false, summary: [] };
    return res.status(500).json({ success: false, message: "Failed to fetch inbound summary" });
  }
};

/*
====================================================
 📤 OUTBOUND SUMMARY (Role Based)
====================================================
*/
exports.fetchOutboundSummary = async (req, res, returnRaw = false) => {
  try {
    let { dateRange } = req.query;
    let dateFrom = null;
    let dateTo = new Date().toISOString();

    if (dateRange === "7days") {
      dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (dateRange === "1month") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      dateFrom = d.toISOString();
    } else if (dateRange === "1year") {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      dateFrom = d.toISOString();
    } else if (dateRange === "all") {
      dateFrom = null; // fetch all
      dateTo = null;
    }

    const calls = (await getOutboundCallLogs({ dateFrom, dateTo })) || [];
    console.log("RAW OUTBOUND CALLS:", calls);

    const role = req.user?.role;
    const assignedNumbers = req.user?.assigned_numbers || [];
    const normalizedAssigned = assignedNumbers.map(normalizeNumber);

    let filtered = calls;

    if (role !== "admin") {
      filtered = calls.filter(
        (call) =>
          normalizedAssigned.includes(normalizeNumber(call.fromNumber)) ||
          normalizedAssigned.includes(normalizeNumber(call.toNumber))
      );
    }

    const summary = {};

    for (const call of filtered) {
      const keyNumber = call.toNumber || "Unknown";

      if (!summary[keyNumber]) {
        summary[keyNumber] = {
          toNumber: keyNumber,
          totalCalls: 0,
          completedCalls: 0,
          totalDuration: 0,
          callDetails: [],
        };
      }

      summary[keyNumber].totalCalls++;
      summary[keyNumber].totalDuration += call.duration || 0;
      if (call.result?.toLowerCase().includes("completed")) summary[keyNumber].completedCalls++;
      summary[keyNumber].callDetails.push(call);
    }

    const response = {
      success: true,
      totalOutboundCalls: filtered.length,
      summary: Object.values(summary),
    };

    if (returnRaw) return response;
    return res.json(response);
  } catch (error) {
    console.error("❌ OUTBOUND ERROR:", error);
    if (returnRaw) return { success: false, summary: [] };
    return res.status(500).json({ success: false, message: "Failed to fetch outbound summary" });
  }
};
