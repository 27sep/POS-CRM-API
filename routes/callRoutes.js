const express = require("express");
const router = express.Router();
const callController = require("../controllers/callController");

router.post("/sync", callController.syncCallFromRingCentral);
router.get("/", callController.getAllCallLogs);
router.get("/:callId", callController.getCallById);
router.put("/:callId", callController.updateCallLog);
router.delete("/:callId", callController.deleteCallLog);

module.exports = router;
