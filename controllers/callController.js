const CallLog = require("../models/CallLog");
const { platform } = require("../config/ringcentral");

/* ====================================================
   📥 SYNC CALL FROM RINGCENTRAL
==================================================== */
exports.syncCallFromRingCentral = async (req, res) => {
  try {
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({
        success: false,
        message: "callId is required",
      });
    }

    // Fetch call details from RingCentral
    const response = await platform.get(
      `/restapi/v1.0/account/~/call-log/${callId}`
    );

    const callData = await response.json();

    if (!callData || !callData.id) {
      return res.status(404).json({
        success: false,
        message: "Call not found in RingCentral",
      });
    }

    // Save or update call in MongoDB
    const savedCall = await CallLog.findOneAndUpdate(
      { callId: callData.id },
      {
        callId: callData.id,
        sessionId: callData.sessionId || null,
        direction: callData.direction || null,
        from: callData.from?.phoneNumber || null,
        to: callData.to?.phoneNumber || null,
        duration: callData.duration || 0,
        result: callData.result || null,
        timestamp: callData.startTime || null,
        recordingId: callData.recording?.id || null,
        recordingUrl: callData.recording?.contentUri || null,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: "Call synced successfully",
      data: savedCall,
    });
  } catch (err) {
    console.error("Sync Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to sync call",
      error: err.message,
    });
  }
};

/* ====================================================
   📄 GET ALL CALLS
==================================================== */
exports.getAllCallLogs = async (req, res) => {
  try {
    const calls = await CallLog.find({})
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({
      success: true,
      count: calls.length,
      data: calls,
    });
  } catch (err) {
    console.error("Get Calls Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch call logs",
    });
  }
};

/* ====================================================
   📄 GET SINGLE CALL
==================================================== */
exports.getCallById = async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await CallLog.findOne({ callId });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    res.json({
      success: true,
      data: call,
    });
  } catch (err) {
    console.error("Get Call Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch call",
    });
  }
};

/* ====================================================
   ✏️ UPDATE CALL (Editable Fields Only)
==================================================== */
exports.updateCallLog = async (req, res) => {
  try {
    const { callId } = req.params;

    // Only allow specific fields to be updated
    const allowedFields = [
      "clientFullName",
      "dob",
      "address",
      "reasonForCall",
      "carrierCalledFor",
      "typeOfSale",
      "callOutcome",
      "agentName",
      "notes",
    ];

    let updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updatedCall = await CallLog.findOneAndUpdate(
      { callId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedCall) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    res.json({
      success: true,
      message: "Call updated successfully",
      data: updatedCall,
    });
  } catch (err) {
    console.error("Update Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to update call",
    });
  }
};

/* ====================================================
   🗑 DELETE CALL
==================================================== */
exports.deleteCallLog = async (req, res) => {
  try {
    const { callId } = req.params;

    const deleted = await CallLog.findOneAndDelete({ callId });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    res.json({
      success: true,
      message: "Call deleted successfully",
    });
  } catch (err) {
    console.error("Delete Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to delete call",
    });
  }
};
