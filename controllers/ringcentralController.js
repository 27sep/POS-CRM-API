const { getCallLogs } = require("../services/ringcentralService");

const fetchCallLogs = async (req, res) => {
  try {
    const logs = await getCallLogs(req.query);
    res.status(200).json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { fetchCallLogs };
