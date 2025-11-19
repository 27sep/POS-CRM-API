const { sendSMSMessage, getSentSMSMessages } = require("../services/ringCentralSMSService");

const normalizeNumber = (num) => (num ? num.replace(/\D/g, "") : "");

/*
====================================================
 📤 SEND SMS CONTROLLER
====================================================
*/
exports.sendRingCentralSMS = async (req, res) => {
  try {
    const user = req.user;

    // Always use the number assigned to the JWT user
    const fromNumber = user.phone || user.assigned_numbers?.[0];
    if (!fromNumber) {
      return res.status(400).json({
        success: false,
        message: "No valid fromNumber assigned to this user.",
      });
    }

    const toNumber = req.body.toNumber?.trim();
    const message = req.body.message?.trim();

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
      error: error.message,
    });
  }
};

/*
====================================================
 📜 FETCH SENT SMS CONTROLLER
====================================================
*/
exports.fetchSentRingCentralSMS = async (req, res) => {
  try {
    const { dateRange } = req.query;

    let dateFrom = null;
    let dateTo = new Date().toISOString();

    switch (dateRange) {
      case "7days":
        dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "1month":
        const d1 = new Date(); d1.setMonth(d1.getMonth() - 1); dateFrom = d1.toISOString(); break;
      case "1year":
        const d2 = new Date(); d2.setFullYear(d2.getFullYear() - 1); dateFrom = d2.toISOString(); break;
      case "all": dateFrom = null; dateTo = null; break;
      default: break;
    }

    const messages = await getSentSMSMessages({ dateFrom, dateTo }) || [];

    const { role, assigned_numbers = [], phone } = req.user;
    const allowedNumbers = role === "admin" ? null : [...assigned_numbers.map(normalizeNumber), normalizeNumber(phone)];

    const filtered = allowedNumbers
      ? messages.filter(msg =>
          allowedNumbers.includes(normalizeNumber(msg.fromNumber)) ||
          allowedNumbers.includes(normalizeNumber(msg.toNumber))
        )
      : messages;

    const summary = {};
    for (const sms of filtered) {
      const key = sms.fromNumber;
      if (!summary[key]) summary[key] = { fromNumber: sms.fromNumber, totalMessages: 0, smsDetails: [] };
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
/*
====================================================
 🔍 DEBUG SMS SETUP ENDPOINT
====================================================
*/
exports.debugSMSSetup = async (req, res) => {
  try {
    const { getAvailableSMSNumbers } = require("../services/ringCentralSMSService");
    const user = req.user;
    const availableNumbers = await getAvailableSMSNumbers();
    
    return res.json({
      success: true,
      message: "SMS Setup Debug Information",
      user: {
        userId: user.userId,
        role: user.role,
        assigned_numbers: user.assigned_numbers,
        hasAssignedNumber: !!user.assigned_numbers?.[0]
      },
      availableNumbers: availableNumbers,
      businessSmsInfo: {
        brand: "Luminex Advisors LLC",
        status: "Approved",
        campaignId: "C0PNSHA",
        numbersAssigned: 10
      }
    });
  } catch (error) {
    console.error("❌ SMS DEBUG ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Debug endpoint failed",
      error: error.message
    });
  }
};