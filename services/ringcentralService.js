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

// 📥 Fetch Inbound Call Logs (all fields)
async function getInboundCallLogs(params = {}) {
  const { dateFrom, dateTo } = params;
  const platform = getPlatform();

  const query = {
    perPage: 1000,
    view: 'Detailed',
    showBlocked: true,
  };
  if (dateFrom) query.dateFrom = dateFrom;
  if (dateTo) query.dateTo = dateTo;

  const records = await fetchAllCallLogs(platform, query);

  // 1️⃣ Filter main records by inbound
  const inboundLogs = records.filter(record => record.direction === 'Inbound');

  // 2️⃣ Filter legs so only inbound legs remain
  const cleanedLogs = inboundLogs.map(record => ({
    ...record,
    legs: (record.legs || []).filter(leg => leg.direction === 'Inbound')
  }));

  return cleanedLogs;
}


// 📤 Fetch Outbound Call Logs (all fields)
async function getOutboundCallLogs(params = {}) {
  const { dateFrom, dateTo } = params;
  const platform = getPlatform();

  const query = {
    perPage: 1000,
    view: 'Detailed',
    showBlocked: true,
  };
  if (dateFrom) query.dateFrom = dateFrom;
  if (dateTo) query.dateTo = dateTo;

  const records = await fetchAllCallLogs(platform, query);

  // 1️⃣ Filter main records by outbound
  const outboundLogs = records.filter(record => record.direction === 'Outbound');

  // 2️⃣ Filter legs so only outbound legs remain
  const cleanedLogs = outboundLogs.map(record => ({
    ...record,
    legs: (record.legs || []).filter(leg => leg.direction === 'Outbound')
  }));

  return cleanedLogs;
}

module.exports = { getInboundCallLogs, getOutboundCallLogs };
