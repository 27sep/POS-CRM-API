// routes/testSocket.js
const express = require("express");
const router = express.Router();
const { getIO } = require("../utils/socket");

router.get("/incoming", (req, res) => {
  try {
    const io = getIO();
    const callData = {
      callId: req.query.callId || `TEST_CALL_${Date.now()}`,
      from: req.query.from || "+919776330933",
      callerName: req.query.name || "WIRELESS CALLER",
      to: req.query.to || "+18772004944",
      status: "ringing"
    };

    console.log("📞 Emitting test incoming call:", callData);
    console.log("📊 Active Socket.IO clients:", io.engine.clientsCount);
    
    io.emit("incoming-call", callData);
    
    res.json({ 
      success: true, 
      message: "Incoming call emitted",
      call: callData,
      clients: io.engine.clientsCount
    });
  } catch (error) {
    console.error("❌ Test route error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add a test page to verify socket connection
router.get("/socket-test", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Socket.IO Test</title>
        <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
      </head>
      <body>
        <h1>Socket.IO Connection Test</h1>
        <div id="status">🔄 Connecting...</div>
        <div id="calls"></div>
        
        <script>
          const socket = io('${process.env.WEBHOOK_PUBLIC_URL || "http://localhost:5000"}', {
            transports: ['websocket'],
            reconnection: true
          });
          
          socket.on('connect', () => {
            document.getElementById('status').innerHTML = '✅ Connected! Socket ID: ' + socket.id;
          });
          
          socket.on('connect_error', (err) => {
            document.getElementById('status').innerHTML = '❌ Connection failed: ' + err.message;
          });
          
          socket.on('incoming-call', (call) => {
            document.getElementById('calls').innerHTML += 
              '<div style="border:1px solid green; padding:10px; margin:10px">' +
              '📞 Incoming Call: ' + call.callerName + ' - ' + call.from +
              '</div>';
          });
        </script>
      </body>
    </html>
  `);
});

module.exports = router;