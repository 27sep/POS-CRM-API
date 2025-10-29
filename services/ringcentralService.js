const { rc } = require("../config/ringcentral");

const getCallLogs = async (query = {}) => {
  try {
    const response = await rc.get("/restapi/v1.0/account/~/call-log", {
      query: { perPage: 50, ...query },
    });
    return response.data.records;
  } catch (error) {
    console.error("RingCentral API Error:", error);
    throw new Error("Failed to fetch call logs");
  }
};

module.exports = { getCallLogs };
