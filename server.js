require("dotenv").config();

const app = require("./app");
const { initSocket } = require("./utils/socket");
const { startRingCentralWebSocket } = require("./services/ringcentralWebsocket");

const PORT = process.env.PORT || 5000;

async function startServer() {

  console.log("🚀 Starting server initialization...");
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);

  try {

    // 1️⃣ Start Express server
    const server = app.listen(PORT, "0.0.0.0", () => {

      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`➡️ Local: http://localhost:${PORT}`);
      console.log(`🌍 Network: http://0.0.0.0:${PORT}`);

      console.log("✅ Express server started");

    });

    // 2️⃣ Start Socket.IO
    initSocket(server);

    // 3️⃣ Initialize RingCentral
    setTimeout(async () => {

      try {

        const { loginRingCentral } = require("./config/ringcentral");

        await loginRingCentral();

        console.log("✅ RingCentral connected");

        // 🔥 START WEBSOCKET
        await startRingCentralWebSocket();

        console.log("📡 RingCentral WebSocket started");

      } catch (rcError) {

        console.error("❌ RingCentral initialization failed");
        console.error(rcError.message);

      }

    }, 2000);

    // Graceful shutdown
    process.on("SIGTERM", () => {

      console.log("SIGTERM received");

      server.close(() => {
        console.log("Process terminated");
      });

    });

    process.on("SIGINT", () => {

      console.log("SIGINT received");

      server.close(() => {
        console.log("Process terminated");
      });

    });

  } catch (error) {

    console.error("❌ Server startup failed:", error.message);
    process.exit(1);

  }

}

startServer();