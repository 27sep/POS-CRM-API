const { getPlatform } = require("../config/ringcentral");

// Normalize phone number
const normalizeNumber = (num) => (num ? num.replace(/\D/g, "") : "");

/*
====================================================
 📤 SEND SMS (WITH BUSINESS SMS SUPPORT)
====================================================
*/
async function sendSMSMessage({ fromNumber, toNumber, message }) {
  try {
    const platform = getPlatform();

    console.log("🔑 RingCentral Platform initialized:", !!platform);
    console.log("🔑 RingCentral Access Token exists:", !!platform.auth()?.accessToken);

    const cleanFrom = fromNumber?.trim();
    const cleanTo = toNumber?.trim();

    console.log(`📤 Preparing SMS: ${cleanFrom} -> ${cleanTo}`);

    // First, let's check what numbers are available
    try {
      const numbersResp = await platform.get("/restapi/v1.0/account/~/extension/~/phone-number");
      const numbersData = await numbersResp.json();
      
      const smsNumbers = numbersData.records?.filter(num => 
        num.features?.includes('SmsSender')
      ) || [];

      console.log("📱 Available SMS-Capable Numbers:", smsNumbers.map(n => ({
        number: n.phoneNumber,
        features: n.features,
        type: n.type
      })));

      // Check if our fromNumber is in the available numbers
      const canUseFromNumber = smsNumbers.some(num => 
        normalizeNumber(num.phoneNumber) === normalizeNumber(cleanFrom)
      );

      console.log(`🔍 Can use fromNumber ${cleanFrom}:`, canUseFromNumber);

      if (!canUseFromNumber && smsNumbers.length > 0) {
        // Use the first available SMS number instead
        const fallbackNumber = smsNumbers[0].phoneNumber;
        console.log(`🔄 Using fallback number: ${fallbackNumber}`);
        return await sendWithNumber(fallbackNumber, cleanTo, message);
      }

    } catch (numberError) {
      console.error("❌ Error checking available numbers:", numberError);
      // Continue with original fromNumber
    }

    // Try with the original fromNumber
    return await sendWithNumber(cleanFrom, cleanTo, message);

  } catch (error) {
    console.error("❌ RingCentral SMS Send Error:", error);

    if (error.response) {
      try {
        const errorText = await error.response.text();
        console.error("🔍 SMS API Error Response:", errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText };
        }
        
        const enhancedError = new Error(
          `SMS Failed: ${errorData.message || error.message}`
        );
        enhancedError.apiResponse = errorData;
        throw enhancedError;
        
      } catch (e) {
        console.error("🔍 Could not parse error response");
      }
    }
    
    throw error;
  }
}

/*
====================================================
 🔄 HELPER: SEND WITH SPECIFIC NUMBER
====================================================
*/
async function sendWithNumber(fromNumber, toNumber, message) {
  const platform = getPlatform();

  console.log(`🚀 Sending SMS with from: ${fromNumber}, to: ${toNumber}`);

  const body = {
    from: { phoneNumber: fromNumber },
    to: [{ phoneNumber: toNumber }],
    text: message,
  };

  console.log("📦 Request Body:", JSON.stringify(body, null, 2));

  try {
    // Attempt 1: Send with from number
    const resp = await platform.post("/restapi/v1.0/account/~/extension/~/sms", body);
    const data = await resp.json();

    console.log("✅ SMS Sent Successfully:", {
      id: data.id,
      status: data.messageStatus,
      from: data.from?.phoneNumber,
      to: data.to?.[0]?.phoneNumber
    });

    return {
      id: data.id,
      fromNumber: data.from?.phoneNumber,
      toNumber: data.to?.map(t => t.phoneNumber).join(","),
      messageStatus: data.messageStatus,
      text: data.subject || message,
      creationTime: data.creationTime,
      direction: data.direction || "Outbound",
      method: "with_from_number"
    };

  } catch (errorWithFrom) {
    console.log("🔄 Attempt with from number failed, trying without from...");
    
    // Attempt 2: Send without from number (use default)
    const bodyWithoutFrom = {
      to: [{ phoneNumber: toNumber }],
      text: message,
    };

    const resp = await platform.post("/restapi/v1.0/account/~/extension/~/sms", bodyWithoutFrom);
    const data = await resp.json();

    console.log("✅ SMS Sent Successfully (default number):", {
      id: data.id,
      status: data.messageStatus,
      from: data.from?.phoneNumber,
      to: data.to?.[0]?.phoneNumber
    });

    return {
      id: data.id,
      fromNumber: data.from?.phoneNumber, // This will be the default number
      toNumber: data.to?.map(t => t.phoneNumber).join(","),
      messageStatus: data.messageStatus,
      text: data.subject || message,
      creationTime: data.creationTime,
      direction: data.direction || "Outbound",
      method: "default_number"
    };
  }
}

/*
====================================================
 📜 FETCH SENT SMS
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

    let allRecords = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const resp = await platform.get("/restapi/v1.0/account/~/extension/~/message-store", {
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

    return allRecords.map(msg => ({
      id: msg.id,
      fromNumber: msg.from?.phoneNumber || "Unknown",
      toNumber: msg.to?.map(t => t.phoneNumber).join(",") || "Unknown",
      text: msg.subject,
      messageStatus: msg.messageStatus,
      creationTime: msg.creationTime,
      direction: msg.direction,
      type: msg.type || "SMS"
    }));

  } catch (error) {
    console.error("❌ Fetch RingCentral SMS Error:", error);
    if (error.response) {
      try {
        console.error("🔍 API Response:", await error.response.text());
      } catch {}
    }
    throw error;
  }
}

/*
====================================================
 🔍 GET AVAILABLE SMS NUMBERS
====================================================
*/
async function getAvailableSMSNumbers() {
  try {
    const platform = getPlatform();

    const numbersResp = await platform.get("/restapi/v1.0/account/~/extension/~/phone-number");
    const numbersData = await numbersResp.json();

    const smsNumbers = numbersData.records?.filter(num => 
      num.features?.includes('SmsSender')
    ) || [];

    console.log("📱 Available SMS Numbers:", smsNumbers.map(n => ({
      number: n.phoneNumber,
      features: n.features,
      type: n.type,
      usageType: n.usageType
    })));

    return {
      smsCapableNumbers: smsNumbers,
      totalNumbers: smsNumbers.length
    };

  } catch (error) {
    console.error("❌ SMS Numbers Info Error:", error);
    throw error;
  }
}

module.exports = {
  sendSMSMessage,
  getSentSMSMessages,
  getAvailableSMSNumbers
};