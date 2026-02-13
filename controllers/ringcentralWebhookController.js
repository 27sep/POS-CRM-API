// ringcentralWebhookController.js
const CallLog = require("../models/CallLog");
const { getIO } = require("../utils/socket");

exports.handleCallEvent = async (req, res) => {
  try {
    const event = req.body;
    console.log("📞 RingCentral Webhook Received:", JSON.stringify(event, null, 2));
    
    const session = event.body?.telephonySession;
    if (!session) return res.sendStatus(200);

    const party = session.parties?.find(
      (p) => p.status?.code !== "Disconnected"
    );
    if (!party) return res.sendStatus(200);

    const status = party.status.code;
    const from = party.from?.phoneNumber;
    const to = party.to?.phoneNumber;
    const callerName = party.from?.name || "Unknown";

    const io = getIO();

    // 🔴 LIVE INCOMING CALL - RINGING
    if (status === "Ringing") {
      console.log(`🔔 INCOMING CALL: From ${from} (${callerName})`);
      
      io.emit("incoming-call", {  // ← CRITICAL: Match frontend event name
        callId: session.id,
        from,
        to,
        callerName,  // ← Send as 'callerName' not 'name'
        status: "ringing",
        timestamp: new Date().toISOString()
      });
    }

    // 🟢 CALL ANSWERED
    if (status === "Answered") {
      console.log(`✅ CALL ANSWERED: ${session.id}`);
      io.emit("call-active", {
        callId: session.id,
        status: "active",
      });
    }

    // 🔴 CALL ENDED
    if (status === "Disconnected") {
      console.log(`❌ CALL ENDED: ${session.id}`);
      
      // Save to database
      await CallLog.create({
        callId: session.id,
        direction: session.direction,
        fromNumber: from,
        toNumber: to,
        callerName,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        status: "ended",
        rawPayload: event,
      });

      io.emit("call-ended", { callId: session.id });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.sendStatus(200); // Always return 200 to RingCentral
  }
};