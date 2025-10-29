const express = require("express");
const { fetchCallLogs } = require("../controllers/ringcentralController");

const router = express.Router();

// GET call logs
router.get("/call-logs", fetchCallLogs);

module.exports = router;
