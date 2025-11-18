const { getPlatform } = require('../config/ringcentral');

// Helper to fetch all pages from RingCentral
async function fetchAllCallLogs(platform, query) {
  let allRecords = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const resp = await platform.get('/restapi/v1.0/account/~/extension/~/call-log', {
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

// 📥 Fetch Inbound Call Logs
async function getInboundCallLogs({ dateFrom, dateTo, assignedNumbers = null } = {}) {
  try {
    const platform = getPlatform();
    const query = {
      perPage: 1000,
      view: 'Simple',
      direction: 'Inbound',
      showBlocked: true,
    };

    if (dateFrom) query.dateFrom = dateFrom;
    if (dateTo) query.dateTo = dateTo;

    const records = await fetchAllCallLogs(platform, query);

    // Optional: filter assigned numbers directly here
    let filteredRecords = records;
    if (assignedNumbers?.length) {
      const normalizedAssigned = assignedNumbers.map(n => n.replace(/\D/g, ""));
      filteredRecords = records.filter(
        (r) =>
          normalizedAssigned.includes((r.from?.phoneNumber || "").replace(/\D/g, "")) ||
          normalizedAssigned.includes((r.to?.phoneNumber || "").replace(/\D/g, ""))
      );
    }

    return filteredRecords.map(log => ({
      id: log.id,
      fromNumber: log.from?.phoneNumber || 'Unknown',
      toNumber: log.to?.phoneNumber || 'Unknown',
      startTime: log.startTime,
      duration: log.duration,
      result: log.result,
      type: log.type,
    }));

  } catch (error) {
    console.error('❌ Error fetching inbound call logs:', error.message);
    if (error.response) console.error('🔍 API Response:', await error.response.text());
    throw error;
  }
}

// 📤 Fetch Outbound Call Logs
async function getOutboundCallLogs({ dateFrom, dateTo, assignedNumbers = null } = {}) {
  try {
    const platform = getPlatform();
    const query = {
      perPage: 1000,
      view: 'Simple',
      direction: 'Outbound',
      showBlocked: true,
    };

    if (dateFrom) query.dateFrom = dateFrom;
    if (dateTo) query.dateTo = dateTo;

    const records = await fetchAllCallLogs(platform, query);

    // Optional: filter assigned numbers directly here
    let filteredRecords = records;
    if (assignedNumbers?.length) {
      const normalizedAssigned = assignedNumbers.map(n => n.replace(/\D/g, ""));
      filteredRecords = records.filter(
        (r) =>
          normalizedAssigned.includes((r.from?.phoneNumber || "").replace(/\D/g, "")) ||
          normalizedAssigned.includes((r.to?.phoneNumber || "").replace(/\D/g, ""))
      );
    }

    return filteredRecords.map(log => ({
      id: log.id,
      fromNumber: log.from?.phoneNumber || 'Unknown',
      toNumber: log.to?.phoneNumber || 'Unknown',
      startTime: log.startTime,
      duration: log.duration,
      result: log.result,
      type: log.type,
    }));

  } catch (error) {
    console.error('❌ Error fetching outbound call logs:', error.message);
    if (error.response) console.error('🔍 API Response:', await error.response.text());
    throw error;
  }
}

module.exports = { getInboundCallLogs, getOutboundCallLogs };
