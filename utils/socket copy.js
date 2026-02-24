// utils/socket.js - Add debug logging
const { Server } = require("socket.io");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // In production, change this to your frontend URL
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'] // Allow both
  });

  // Debug all socket events
  io.on("connection", (socket) => {
    console.log("📞 Client connected:", socket.id);
    console.log("🌍 Client origin:", socket.handshake.headers.origin);
    console.log("🔌 Transport:", socket.conn.transport.name);
    console.log("👥 Total clients:", io.engine.clientsCount);

    // Log all incoming events
    socket.onAny((event, ...args) => {
      console.log(`📨 Socket Event [${socket.id}]: ${event}`, args);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Client disconnected:", socket.id, "Reason:", reason);
    });

    socket.on("error", (error) => {
      console.error("⚠️ Socket error:", socket.id, error);
    });
  });

  console.log("🔌 Socket.IO initialized");
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

module.exports = { initSocket, getIO };