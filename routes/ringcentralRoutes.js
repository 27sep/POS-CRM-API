const express = require("express");
const router = express.Router();

const {
  fetchInboundSummary,
  fetchOutboundSummary,
  answerCall,
  hangupCall,
  muteCall,
  holdCall,
  recordCall,
} = require("../controllers/ringcentralController");


const { authMiddleware } = require("../middlewares/authMiddleware");

// 🔐 Apply authentication middleware (ALL routes below are protected)
router.use(authMiddleware);

/*
--------------------------------------
 📥 INBOUND CALL SUMMARY (Role Based)
--------------------------------------
*/
router.get("/inbound-summary", async (req, res) => {
  try {
    const { role } = req.user;

    const result = await fetchInboundSummary(req, null, true);
    const summary = Array.isArray(result?.summary) ? result.summary : [];

    return res.json({
      success: true,
      role,
      totalInboundCalls: summary.length,
      summary,
    });
  } catch (error) {
    console.error("🔴 ROUTE ERROR (INBOUND):", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

/*
--------------------------------------
 📤 OUTBOUND CALL SUMMARY (Role Based)
--------------------------------------
*/
router.get("/outbound-summary", async (req, res) => {
  try {
    const { role } = req.user;

    const result = await fetchOutboundSummary(req, null, true);
    const summary = Array.isArray(result?.summary) ? result.summary : [];

    return res.json({
      success: true,
      role,
      totalOutboundCalls: summary.length,
      summary,
    });
  } catch (error) {
    console.error("🔴 ROUTE ERROR (OUTBOUND):", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

/*
--------------------------------------
 📞 CALL CONTROL APIs (LIVE)
--------------------------------------
*/

// ✅ Answer incoming call
router.post("/call/answer", answerCall);

// ❌ Hangup / End call
router.post("/call/hangup", hangupCall);

// 🔇 Mute / Unmute
router.post("/call/mute", muteCall);

// ⏸ Hold / Resume
router.post("/call/hold", holdCall);

// ⏺ Start / Stop Recording
router.post("/call/record", recordCall);

module.exports = router;
