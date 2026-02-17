// ringcentralWebhookController.js
const CallLog = require("../models/CallLog");
const { getIO } = require("../utils/socket");

exports.handleCallEvent = async (req, res) => {
  const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  try {
    console.log(`[${requestId}] ===== RINGCENTRAL WEBHOOK RECEIVED =====`);
    console.log(`[${requestId}] Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`[${requestId}] Body:`, JSON.stringify(req.body, null, 2));
    console.log(`[${requestId}] Query:`, req.query);
    console.log(`[${requestId}] Method:`, req.method);

    const event = req.body;

    // Handle RingCentral webhook verification
    // if (req.query.validationToken || event.validationToken) {
    //   const validationToken = req.query.validationToken || event.validationToken;
    //   console.log(`[${requestId}] 🔑 Validation token received:`, validationToken);
    //   console.log(`[${requestId}] ✅ Sending validation response`);
    //   return res.status(200).send(validationToken);
    // }

    if (req.headers['validation-token']) {
  console.log("🔑 Validation request received");

  res.setHeader('Validation-Token', req.headers['validation-token']);
  return res.status(200).send();
}


    // Check if this is a RingCentral webhook event
    if (!event || !event.body) {
      console.log(`[${requestId}] ⚠️ Invalid webhook format - missing body`);
      return res.sendStatus(200);
    }

    // Extract the actual event data - RingCentral webhook structure
    const webhookData = event.body;
    console.log(`[${requestId}] Webhook Data:`, JSON.stringify(webhookData, null, 2));

    // Check for telephony session (RingCentral call events)
    const telephonySession = webhookData.telephonySession;
    if (!telephonySession) {
      console.log(`[${requestId}] ⚠️ No telephony session in webhook - ignoring non-call event`);
      return res.sendStatus(200);
    }

    const sessionId = telephonySession.id;
    console.log(`[${requestId}] 📞 Call Session ID:`, sessionId);
    console.log(`[${requestId}] Direction:`, telephonySession.direction);

    // Get the active party or first party
    let party = null;
    if (telephonySession.parties && telephonySession.parties.length > 0) {
      // Find party that's not disconnected, or use first one
      party = telephonySession.parties.find(p => p.status?.code !== 'Disconnected') || 
              telephonySession.parties[0];
      
      console.log(`[${requestId}] Party Status:`, party.status?.code);
      console.log(`[${requestId}] Party From:`, party.from);
      console.log(`[${requestId}] Party To:`, party.to);
    }

    if (!party) {
      console.log(`[${requestId}] ⚠️ No parties found in session`);
      return res.sendStatus(200);
    }

    // Extract call details with fallbacks
    const status = party.status?.code || 'Unknown';
    const fromNumber = party.from?.phoneNumber || party.from?.extensionNumber || 'Unknown';
    const toNumber = party.to?.phoneNumber || party.to?.extensionNumber || 'Unknown';
    const callerName = party.from?.name || party.from?.callerIdName || 'Unknown';

    console.log(`[${requestId}] Call Status: ${status}`);
    console.log(`[${requestId}] From: ${fromNumber} (${callerName})`);
    console.log(`[${requestId}] To: ${toNumber}`);

    // Get Socket.IO instance
    const io = getIO();
    if (!io) {
      console.error(`[${requestId}] ❌ Socket.IO not initialized`);
    } else {
      console.log(`[${requestId}] ✅ Socket.IO connected, active connections:`, io.engine?.clientsCount || 0);
    }

    // Handle different call states
    switch (status) {
      case 'Ringing':
      case 'Setup':
        console.log(`[${requestId}] 🔔 INCOMING CALL DETECTED - Ringing`);
        
        const incomingCallData = {
          callId: sessionId,
          from: fromNumber,
          to: toNumber,
          callerName: callerName,
          status: 'ringing',
          timestamp: new Date().toISOString(),
          direction: telephonySession.direction || 'inbound'
        };
        
        console.log(`[${requestId}] Emitting incoming-call:`, incomingCallData);
        
        if (io) {
          // Emit to all connected clients
          io.emit('incoming-call', incomingCallData);
          
          // Also emit to specific room if you have user-specific rooms
          // io.to(`user-${toNumber}`).emit('incoming-call', incomingCallData);
          
          console.log(`[${requestId}] ✅ incoming-call event emitted`);
        }
        break;

      case 'Answered':
      case 'Connected':
        console.log(`[${requestId}] ✅ CALL ANSWERED/ACTIVE: ${sessionId}`);
        
        if (io) {
          io.emit('call-active', {
            callId: sessionId,
            status: 'active',
            timestamp: new Date().toISOString()
          });
          console.log(`[${requestId}] ✅ call-active event emitted`);
        }
        break;

      case 'Disconnected':
      case 'Completed':
      case 'Terminated':
        console.log(`[${requestId}] ❌ CALL ENDED: ${sessionId}`);
        
        // Calculate duration if available
        let duration = 0;
        if (telephonySession.startTime && telephonySession.endTime) {
          const start = new Date(telephonySession.startTime).getTime();
          const end = new Date(telephonySession.endTime).getTime();
          duration = Math.round((end - start) / 1000); // duration in seconds
        }

        // Prepare call log data for database
        const callLogData = {
          callId: sessionId,
          direction: telephonySession.direction || 'unknown',
          fromNumber: fromNumber,
          toNumber: toNumber,
          callerName: callerName,
          startTime: telephonySession.startTime || new Date().toISOString(),
          endTime: telephonySession.endTime || new Date().toISOString(),
          duration: duration,
          status: 'ended',
          recording: telephonySession.recording || false,
          rawPayload: JSON.stringify(webhookData) // Store as string
        };

        console.log(`[${requestId}] 💾 Saving call to database:`, callLogData);

        // Save to database
        try {
          // Check if call already exists
          let existingCall = await CallLog.findOne({ callId: sessionId });
          
          if (existingCall) {
            // Update existing record
            existingCall.endTime = callLogData.endTime;
            existingCall.duration = callLogData.duration;
            existingCall.status = 'ended';
            await existingCall.save();
            console.log(`[${requestId}] ✅ Updated existing call log:`, existingCall._id);
          } else {
            // Create new record
            const savedLog = await CallLog.create(callLogData);
            console.log(`[${requestId}] ✅ Created new call log:`, savedLog._id);
          }
        } catch (dbError) {
          console.error(`[${requestId}] ❌ Database error:`, dbError.message);
          console.error(`[${requestId}] Error details:`, dbError);
          
          // Try without raw payload if that fails
          try {
            const { rawPayload, ...simpleLogData } = callLogData;
            
            let existingCall = await CallLog.findOne({ callId: sessionId });
            if (existingCall) {
              existingCall.endTime = simpleLogData.endTime;
              existingCall.duration = simpleLogData.duration;
              existingCall.status = 'ended';
              await existingCall.save();
            } else {
              await CallLog.create(simpleLogData);
            }
            console.log(`[${requestId}] ✅ Saved call log (without raw payload)`);
          } catch (simpleDbError) {
            console.error(`[${requestId}] ❌ Second DB attempt failed:`, simpleDbError.message);
          }
        }

        // Emit call-ended event
        if (io) {
          io.emit('call-ended', {
            callId: sessionId,
            duration: duration,
            timestamp: new Date().toISOString()
          });
          console.log(`[${requestId}] ✅ call-ended event emitted`);
        }
        break;

      case 'Hold':
        console.log(`[${requestId}] ⏸️ Call on hold: ${sessionId}`);
        if (io) {
          io.emit('call-hold', {
            callId: sessionId,
            status: 'hold',
            timestamp: new Date().toISOString()
          });
        }
        break;

      default:
        console.log(`[${requestId}] ℹ️ Unhandled status: ${status}`);
    }

    // Always return 200 to RingCentral
    console.log(`[${requestId}] ✅ Sending 200 OK to RingCentral`);
    res.sendStatus(200);

  } catch (error) {
    console.error(`[${requestId}] ❌ CRITICAL ERROR:`, error);
    console.error(`[${requestId}] Error stack:`, error.stack);
    
    // Always return 200 to prevent RingCentral from retrying
    res.sendStatus(200);
  }
};

// Test endpoint for RingCentral webhook verification
exports.testWebhook = async (req, res) => {
  try {
    console.log("🧪 Test webhook called");
    
    const io = getIO();
    
    res.status(200).json({
      success: true,
      message: 'RingCentral webhook is working',
      timestamp: new Date().toISOString(),
      socketConnected: !!io,
      socketClients: io ? io.engine?.clientsCount || 0 : 0
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Manual test endpoint to simulate RingCentral webhook
exports.simulateCall = async (req, res) => {
  try {
    const { status, callId } = req.body;
    
    const mockWebhook = {
      body: {
        telephonySession: {
          id: callId || `test-call-${Date.now()}`,
          direction: 'Inbound',
          parties: [{
            status: { code: status || 'Ringing' },
            from: {
              phoneNumber: '+1234567890',
              name: 'Test Caller'
            },
            to: {
              phoneNumber: '+0987654321',
              extensionNumber: '101'
            }
          }],
          startTime: new Date().toISOString()
        }
      }
    };

    // Create mock request and response
    const mockReq = { body: mockWebhook };
    const mockRes = {
      sendStatus: (code) => {
        console.log(`Mock response status: ${code}`);
      }
    };

    await this.handleCallEvent(mockReq, mockRes);

    res.status(200).json({
      success: true,
      message: 'Simulated call event',
      callId: mockWebhook.body.telephonySession.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};