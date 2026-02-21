// ringcentralWebhookController.js
const CallLog = require("../models/CallLog");
const { getIO } = require("../utils/socket");

exports.handleCallEvent = async (req, res) => {
  const requestId =
    Date.now() + "-" + Math.random().toString(36).substr(2, 9);

  try {
    console.log(
      `[${requestId}] ===== RINGCENTRAL WEBHOOK RECEIVED =====`
    );

    // 🔐 Validation Handling (MUST BE FIRST)
    if (req.headers["validation-token"]) {
      console.log(
        `[${requestId}] 🔑 Validation Token Received:`,
        req.headers["validation-token"]
      );

      res.setHeader(
        "Validation-Token",
        req.headers["validation-token"]
      );
      return res.status(200).send();
    }

    const event = req.body;

    if (!event || !event.body) {
      console.log(
        `[${requestId}] ⚠️ Invalid webhook format`
      );
      return res.sendStatus(200);
    }

    const webhookData = event.body;

    // Real RingCentral telephony session structure
    if (!webhookData.parties || webhookData.parties.length === 0) {
      console.log(
        `[${requestId}] ⚠️ No parties found`
      );
      return res.sendStatus(200);
    }

    const party = webhookData.parties[0];

    const sessionId =
      webhookData.telephonySessionId ||
      webhookData.sessionId;

    const status = party.status?.code || "Unknown";
    const direction = party.direction || "unknown";

    const fromNumber =
      party.from?.phoneNumber ||
      party.from?.extensionNumber ||
      "Unknown";

    const toNumber =
      party.to?.phoneNumber ||
      party.to?.extensionNumber ||
      "Unknown";

    const callerName =
      party.from?.name ||
      party.from?.callerIdName ||
      "Unknown";

    console.log(
      `[${requestId}] 📞 Call ID: ${sessionId}`
    );
    console.log(
      `[${requestId}] Status: ${status}`
    );
    console.log(
      `[${requestId}] From: ${fromNumber}`
    );
    console.log(
      `[${requestId}] To: ${toNumber}`
    );

    const io = getIO();

    // ==============================
    // 🔔 RINGING
    // ==============================
    // ==============================
    // 🔔 CALL EVENT EMIT (ALL STATUS)
    // ==============================
    if (status && io) {
      const normalizedStatus = status.toLowerCase().trim();

      console.log(`[${requestId}] 📞 Emitting incoming-call event:`, normalizedStatus);

      io.emit("incoming-call", {
        callId: sessionId,
        partyId: party?.id || null, // important for answer/hangup APIs
        from: fromNumber?.trim(),
        callerName: callerName?.trim(),
        to: toNumber?.trim(),
        status: normalizedStatus,
        direction,
        timestamp: new Date().toISOString(),
      });
    }

    // ==============================
    // ✅ CONNECTED
    // ==============================
    if (
      status === "Answered" ||
      status === "Connected"
    ) {
      console.log(
        `[${requestId}] ✅ CALL CONNECTED`
      );

      if (io) {
        io.emit("call-active", {
          callId: sessionId,
          status: "active",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // ==============================
    // ❌ DISCONNECTED
    // ==============================
    if (
      status === "Disconnected" ||
      status === "Completed" ||
      status === "Terminated"
    ) {
      console.log(
        `[${requestId}] ❌ CALL ENDED`
      );

      const callLogData = {
        callId: sessionId,
        direction,
        fromNumber,
        toNumber,
        callerName,
        status: "ended",
        timestamp: new Date().toISOString(),
        rawPayload: JSON.stringify(webhookData),
      };

      try {
        let existing = await CallLog.findOne({
          callId: sessionId,
        });

        if (existing) {
          existing.status = "ended";
          await existing.save();
        } else {
          await CallLog.create(callLogData);
        }

        console.log(
          `[${requestId}] 💾 Call saved`
        );
      } catch (dbError) {
        console.error(
          `[${requestId}] ❌ DB Error:`,
          dbError.message
        );
      }

      if (io) {
        io.emit("call-ended", {
          callId: sessionId,
          timestamp: new Date().toISOString(),
        });
      }
    }

    console.log(
      `[${requestId}] ✅ Sending 200 OK`
    );

    res.sendStatus(200);
  } catch (error) {
    console.error(
      `[${requestId}] ❌ CRITICAL ERROR:`,
      error.message
    );
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