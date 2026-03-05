// services/ringcentralWebsocket.js

const WebSocket = require("ws");
const { getPlatform } = require("../config/ringcentral");
const { getIO } = require("../utils/socket");

let ws;

async function startRingCentralWebSocket() {
  try {
    const platform = getPlatform();

    console.log("📡 Creating RingCentral subscription...");

    const res = await platform.post("/restapi/v1.0/subscription", {
      eventFilters: [
        "/restapi/v1.0/account/~/telephony/sessions"
      ],
      deliveryMode: {
        transportType: "WebSocket"
      }
    });

    const subscription = await res.json();

    console.log("✅ Subscription created");

    const wsAddress = subscription.deliveryMode.address;

    console.log("🔌 Connecting WebSocket:", wsAddress);

    ws = new WebSocket(wsAddress);

    ws.on("open", () => {
      console.log("✅ RingCentral WebSocket connected");
    });

    ws.on("message", (msg) => {
      try {
        const eventData = JSON.parse(msg);

        console.log("📞 RingCentral event received");

        const io = getIO();

        // send event to frontend
        io.emit("ringcentral-event", eventData);

      } catch (err) {
        console.error("❌ Event parse error:", err.message);
      }
    });

    ws.on("close", () => {
      console.log("❌ RingCentral WebSocket closed");

      // reconnect after 5 seconds
      setTimeout(() => {
        console.log("🔄 Reconnecting WebSocket...");
        startRingCentralWebSocket();
      }, 5000);
    });

    ws.on("error", (err) => {
      console.error("⚠️ WebSocket error:", err.message);
    });

  } catch (error) {
    console.error("❌ Failed to start RingCentral WebSocket:", error.message);
  }
}

module.exports = { startRingCentralWebSocket };