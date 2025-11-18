// controllers/ringCentralSMSController.js
const { sendSMSMessage, getSentSMSMessages } = require("../services/ringCentralSMSService");

const normalizeNumber = (num) => (num ? num.replace(/\D/g, "") : "");

/*
====================================================
 📤 SEND RINGCENTRAL SMS
====================================================
*/
exports.sendRingCentralSMS = async (req, res) => {
  try {
    const { fromNumber, toNumber, message } = req.body;

    if (!toNumber || !message) {
      return res.status(400).json({
        success: false,
        message: "toNumber and message are required",
      });
    }

    const result = await sendSMSMessage({ fromNumber, toNumber, message });

    return res.json({
      success: true,
      message: "SMS sent successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ SMS SEND ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send SMS",
    });
  }
};

/*
====================================================
 📜 SENT SMS SUMMARY (Role + Date Range)
====================================================
*/
exports.fetchSentRingCentralSMS = async (req, res) => {
  try {
    let { dateRange } = req.query;

    let dateFrom = null;
    let dateTo = new Date().toISOString();

    // DATE FILTER
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
      dateFrom = null;
      dateTo = null;
    }

    // GET SMS
    const messages = await getSentSMSMessages({ dateFrom, dateTo }) || [];

    console.log("📦 RAW SMS:", messages);

    const { role, phone, assigned_numbers = [] } = req.user;
    const normalizedAssigned = assigned_numbers.map(normalizeNumber);
    const normalizedPhone = normalizeNumber(phone);

    let filtered = messages;

    // ROLE BASED FILTER
    if (role !== "admin") {
      const allowed = [...normalizedAssigned, normalizedPhone];

      filtered = messages.filter(
        (msg) =>
          allowed.includes(normalizeNumber(msg.fromNumber)) ||
          allowed.includes(normalizeNumber(msg.toNumber))
      );
    }

    // SUMMARY
    const summary = {};

    for (const sms of filtered) {
      const key = sms.fromNumber;

      if (!summary[key]) {
        summary[key] = {
          fromNumber: sms.fromNumber,
          totalMessages: 0,
          smsDetails: [],
        };
      }

      summary[key].totalMessages++;
      summary[key].smsDetails.push(sms);
    }

    return res.json({
      success: true,
      totalMessages: filtered.length,
      summary: Object.values(summary),
    });

  } catch (error) {
    console.error("❌ SMS FETCH ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch SMS logs",
    });
  }
};
