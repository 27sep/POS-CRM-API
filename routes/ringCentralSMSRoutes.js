// routes/ringcentralSMSRoutes.js
const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/authMiddleware");
const {
  sendRingCentralSMS,
  fetchSentRingCentralSMS,
} = require("../controllers/ringCentralSMSController");

// Apply JWT auth middleware to all routes
router.use(authMiddleware);

/*
===========================================
 📤 SEND RINGCENTRAL SMS
===========================================
*/
router.post("/send", (req, res) => {
  try {
    const user = req.user;

    // Non-admin users must send from their own phone number
    if (user.role !== "admin") {
      req.body.fromNumber = user.phone;
    }

    return sendRingCentralSMS(req, res);

  } catch (error) {
    console.error("🔴 SMS SEND ROUTE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

/*
===========================================
 📜 GET SENT SMS (ROLE + DATE FILTER)
===========================================
*/
router.get("/sent", (req, res) => {
  try {
    // DIRECTLY CALL CONTROLLER (NO returnRaw!)
    return fetchSentRingCentralSMS(req, res);

  } catch (error) {
    console.error("🔴 SMS FETCH ROUTE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

module.exports = router;
