const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/authMiddleware");
const { 
  sendRingCentralSMS, 
  fetchSentRingCentralSMS,
  debugSMSSetup  // Make sure this is imported
} = require("../controllers/ringCentralSMSController");

// Apply JWT auth middleware to all routes
router.use(authMiddleware);

// POST: send SMS
router.post("/send", sendRingCentralSMS);

// GET: fetch sent SMS
router.get("/sent", fetchSentRingCentralSMS);

// GET: debug SMS setup
router.get("/debug-sms-setup", debugSMSSetup);

module.exports = router;