// routes/ringcentralRoutes.js
const express = require("express");
const router = express.Router();

const {
  fetchInboundSummary,
  fetchOutboundSummary,
} = require("../controllers/ringcentralController");

const { authMiddleware } = require("../middlewares/authMiddleware");

// Apply authentication middleware
router.use(authMiddleware);

/*
--------------------------------------
 📥 INBOUND CALL SUMMARY (Role Based)
--------------------------------------
*/
router.get("/inbound-summary", async (req, res) => {
  try {
    const { role, assigned_numbers = [] } = req.user;

    // Controller already filters based on role
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
    const { role, assigned_numbers = [] } = req.user;

    // Controller already filters
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

module.exports = router;
