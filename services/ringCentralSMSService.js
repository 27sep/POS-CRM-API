// services/ringCentralSMSService.js
const { getPlatform } = require('../config/ringcentral');

// Helper: normalize phone number
const normalizeNumber = (num) => (num ? num.replace(/\D/g, "") : "");

/*
====================================================
 🌀 PAGINATION HELPER (Same as call logs)
====================================================
*/
async function fetchAllSMS(platform, query) {
  let allRecords = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const resp = await platform.get('/restapi/v1.0/account/~/extension/~/message-store', {
      ...query,
      page,
    });

    const data = await resp.json();

    if (data.records?.length) {
      allRecords = allRecords.concat(data.records);
      page++;
      hasMore = data.records.length === query.perPage;
    } else {
      hasMore = false;
    }
  }
  return allRecords;
}

/*
====================================================
 📤 SEND SMS (No change)
====================================================
*/
async function sendSMSMessage({ fromNumber, toNumber, message }) {
  try {
    const platform = getPlatform();

    const body = {
      from: { phoneNumber: fromNumber || process.env.RINGCENTRAL_SMS_FROM },
      to: [{ phoneNumber: toNumber }],
      text: message,
    };

    const resp = await platform.post('/restapi/v1.0/account/~/extension/~/sms', body);
    const data = await resp.json();

    return {
      id: data.id,
      fromNumber: data.from?.phoneNumber,
      toNumber: data.to?.map(t => t.phoneNumber).join(','),
      messageStatus: data.messageStatus,
      text: data.subject,
      creationTime: data.creationTime,
      direction: data.direction || "Outbound",
    };

  } catch (error) {
    console.error("❌ RingCentral SMS Send Error:", error);
    if (error.response) console.error("🔍 API Response:", await error.response.text());
    throw error;
  }
}

/*
====================================================
 📜 FETCH SENT SMS (Same logic as call logs)
====================================================
*/
async function getSentSMSMessages({ dateFrom, dateTo }) {
  try {
    const platform = getPlatform();

    const query = {
      messageType: "SMS",
      perPage: 100,
    };

    if (dateFrom) query.dateFrom = dateFrom;
    if (dateTo) query.dateTo = dateTo;

    // Fetch with pagination (same as calls)
    const records = await fetchAllSMS(platform, query);

    if (!records.length) return [];

    return records.map((msg) => ({
      id: msg.id,
      fromNumber: msg.from?.phoneNumber || "Unknown",
      toNumber: msg.to?.map(t => t.phoneNumber).join(",") || "Unknown",
      text: msg.subject,
      messageStatus: msg.messageStatus,
      creationTime: msg.creationTime,
      direction: msg.direction,
    }));

  } catch (error) {
    console.error("❌ Fetch RingCentral SMS Error:", error);
    if (error.response) console.error("🔍 API Response:", await error.response.text());
    throw error;
  }
}

module.exports = {
  sendSMSMessage,
  getSentSMSMessages,
};
