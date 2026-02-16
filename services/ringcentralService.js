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

// 🎙 Fetch recording details for a specific recording ID
async function fetchRecordingDetails(recordingId) {
  try {
    const platform = getPlatform();
    console.log(`🎙 Fetching recording details for ID: ${recordingId}`);
    
    const recRes = await platform.get(
      `/restapi/v1.0/account/~/recording/${recordingId}`
    );
    
    if (recRes.status === 200) {
      const recording = await recRes.json();
      console.log(`✅ Got recording URL: ${recording.contentUri}`);
      
      return {
        id: recording.id,
        contentUri: recording.contentUri,
        contentType: recording.contentType,
        duration: recording.duration
      };
    }
    return null;
  } catch (error) {
    console.log(`⚠️ Error fetching recording ${recordingId}:`, error.message);
    return null;
  }
}

// 📥 Fetch Inbound Call Logs WITH RECORDINGS
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

  // 3️⃣ Fetch recordings for calls that have recordingId
  console.log('🔍 Checking for recordings...');
  
  for (const call of cleanedLogs) {
    // Check if call has recordingId (from your dashboard data)
    if (call.recordingId || (call.recording && call.recording.id)) {
      const recordingId = call.recordingId || call.recording?.id;
      console.log(`✅ Found recording ID ${recordingId} for call ${call.id}`);
      
      // Fetch full recording details
      const recordingDetails = await fetchRecordingDetails(recordingId);
      
      if (recordingDetails) {
        // Add recording to the call object
        call.recording = {
          id: recordingDetails.id,
          contentUri: recordingDetails.contentUri,
          contentType: recordingDetails.contentType,
          duration: recordingDetails.duration
        };
        
        // Also add direct URL for easy access
        call.recordingUrl = recordingDetails.contentUri;
        call.hasRecording = true;
        
        console.log(`✅ Added recording URL to call ${call.id}`);
      }
    } else {
      call.hasRecording = false;
      call.recordingUrl = null;
    }
  }

  // Count calls with recordings
  const callsWithRecordings = cleanedLogs.filter(c => c.hasRecording);
  console.log(`📊 Total inbound calls: ${cleanedLogs.length}`);
  console.log(`📊 Calls with recordings: ${callsWithRecordings.length}`);

  return cleanedLogs;
}

// 📤 Fetch Outbound Call Logs WITH RECORDINGS
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

  // 3️⃣ Fetch recordings for calls that have recordingId
  console.log('🔍 Checking for recordings...');
  
  for (const call of cleanedLogs) {
    // Check if call has recordingId
    if (call.recordingId || (call.recording && call.recording.id)) {
      const recordingId = call.recordingId || call.recording?.id;
      console.log(`✅ Found recording ID ${recordingId} for call ${call.id}`);
      
      // Fetch full recording details
      const recordingDetails = await fetchRecordingDetails(recordingId);
      
      if (recordingDetails) {
        call.recording = {
          id: recordingDetails.id,
          contentUri: recordingDetails.contentUri,
          contentType: recordingDetails.contentType,
          duration: recordingDetails.duration
        };
        call.recordingUrl = recordingDetails.contentUri;
        call.hasRecording = true;
        console.log(`✅ Added recording URL to call ${call.id}`);
      }
    } else {
      call.hasRecording = false;
      call.recordingUrl = null;
    }
  }

  return cleanedLogs;
}

module.exports = { getInboundCallLogs, getOutboundCallLogs };