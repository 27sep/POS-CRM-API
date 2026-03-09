// twilioWebhookController.js
const CallLog = require("../models/CallLog");
const { getIO } = require("../utils/socket");

exports.handleCallEvent = async (req, res) => {
  const requestId =
    Date.now() + "-" + Math.random().toString(36).substr(2, 9);

  try {
    console.log(
      `[${requestId}] ===== TWILIO WEBHOOK RECEIVED =====`
    );

    // Twilio sends data as form-encoded, but with express middleware it's usually parsed
    const event = req.body;

    if (!event) {
      console.log(`[${requestId}] ⚠️ Invalid webhook format`);
      return res.sendStatus(200);
    }

    // Twilio Voice webhook parameters
    const callStatus = event.CallStatus || event.call_status;
    const callSid = event.CallSid || event.call_sid;
    const fromNumber = event.From || event.from || "Unknown";
    const toNumber = event.To || event.to || "Unknown";
    const direction = event.Direction || event.direction || "inbound";
    const callerName = event.caller_name || "Unknown";
    const parentCallSid = event.ParentCallSid || null;
    
    // Additional Twilio specific fields
    const apiVersion = event.ApiVersion;
    const accountSid = event.AccountSid;
    
    // For recording events
    const recordingUrl = event.RecordingUrl;
    const recordingSid = event.RecordingSid;
    const recordingDuration = event.RecordingDuration;

    console.log(`[${requestId}] 📞 Call SID: ${callSid}`);
    console.log(`[${requestId}] Status: ${callStatus}`);
    console.log(`[${requestId}] From: ${fromNumber}`);
    console.log(`[${requestId}] To: ${toNumber}`);

    const io = getIO();

    // ==============================
    // 🔔 RINGING / INITIATED
    // ==============================
    if (callStatus === "ringing" || callStatus === "initiated") {
      console.log(`[${requestId}] 🔔 CALL RINGING`);

      if (io) {
        io.emit("incoming-call", {
          callId: callSid,
          parentCallId: parentCallSid,
          from: fromNumber?.trim(),
          callerName: callerName?.trim(),
          to: toNumber?.trim(),
          status: callStatus.toLowerCase(),
          direction: direction.toLowerCase(),
          timestamp: new Date().toISOString(),
        });
      }
    }

    // ==============================
    // ✅ IN-PROGRESS / ANSWERED
    // ==============================
    if (callStatus === "in-progress" || callStatus === "answered") {
      console.log(`[${requestId}] ✅ CALL ANSWERED / IN PROGRESS`);

      if (io) {
        io.emit("call-active", {
          callId: callSid,
          status: "active",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // ==============================
    // 📞 RECORDING EVENTS (if applicable)
    // ==============================
    if (recordingUrl) {
      console.log(`[${requestId}] 📹 RECORDING AVAILABLE`);
      
      if (io) {
        io.emit("call-recording", {
          callId: callSid,
          recordingUrl,
          recordingSid,
          recordingDuration,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // ==============================
    // ❌ COMPLETED / ENDED
    // ==============================
    if (callStatus === "completed" || callStatus === "busy" || 
        callStatus === "failed" || callStatus === "no-answer" || 
        callStatus === "canceled") {
      
      console.log(`[${requestId}] ❌ CALL ENDED - Status: ${callStatus}`);

      const callLogData = {
        callId: callSid,
        direction: direction.toLowerCase(),
        fromNumber,
        toNumber,
        callerName,
        status: "ended",
        timestamp: new Date().toISOString(),
        rawPayload: JSON.stringify(event),
      };

      try {
        let existing = await CallLog.findOne({ callId: callSid });

        if (existing) {
          existing.status = "ended";
          await existing.save();
        } else {
          await CallLog.create(callLogData);
        }

        console.log(`[${requestId}] 💾 Call saved`);
      } catch (dbError) {
        console.error(`[${requestId}] ❌ DB Error:`, dbError.message);
      }

      if (io) {
        io.emit("call-ended", {
          callId: callSid,
          status: callStatus,
          timestamp: new Date().toISOString(),
        });
      }
    }

    console.log(`[${requestId}] ✅ Sending 200 OK`);

    // Twilio expects a TwiML response for some webhooks
    // For status callbacks, a simple 200 OK is fine
    res.sendStatus(200);
    
  } catch (error) {
    console.error(`[${requestId}] ❌ CRITICAL ERROR:`, error.message);
    res.sendStatus(200);
  }
};

// Test endpoint for Twilio webhook verification
exports.testWebhook = async (req, res) => {
  try {
    console.log("🧪 Test webhook called");

    const io = getIO();

    res.status(200).json({
      success: true,
      message: 'Twilio webhook is working',
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

// Manual test endpoint to simulate Twilio webhook
exports.simulateCall = async (req, res) => {
  try {
    const { status, callSid } = req.body;

    // Mock Twilio webhook payload
    const mockTwilioWebhook = {
      CallSid: callSid || `CA${Date.now()}`,
      CallStatus: status || 'ringing',
      From: '+1234567890',
      To: '+0987654321',
      Direction: 'inbound',
      caller_name: 'Test Caller',
      ApiVersion: '2010-04-01',
      AccountSid: 'ACxxxxxxxxxxxxxx'
    };

    // Create mock request and response
    const mockReq = { body: mockTwilioWebhook };
    const mockRes = {
      sendStatus: (code) => {
        console.log(`Mock response status: ${code}`);
      }
    };

    await this.handleCallEvent(mockReq, mockRes);

    res.status(200).json({
      success: true,
      message: 'Simulated Twilio call event',
      callSid: mockTwilioWebhook.CallSid
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};