// utils/socket.js - With improved error handling
const { Server } = require("socket.io");
const { getPlatform } = require("../config/ringcentral");
const { refreshTokenIfNeeded } = require("../config/ringcentral");

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

    // 📞 ANSWER CALL HANDLER
    socket.on("answer-call", async (data) => {
      console.log(`📞 [${socket.id}] ANSWER CALL:`, data);
      
      try {
        // Ensure RingCentral token is valid
        await refreshTokenIfNeeded();
        const platform = getPlatform();
        
        // First, check the call state
        try {
          const sessionRes = await platform.get(
            `/restapi/v1.0/account/~/telephony/sessions/${data.callId}`
          );
          const session = await sessionRes.json();
          
          console.log(`📊 [${socket.id}] Session state:`, {
            parties: session.parties?.length,
            status: session.parties?.[0]?.status?.code
          });

          // Check if call is already active
          const activeParty = session.parties?.find(p => 
            ['Answered', 'Connected'].includes(p.status?.code)
          );

          if (activeParty) {
            console.log(`⚠️ [${socket.id}] Call already active, emitting active`);
            io.emit("call-active", { 
              callId: data.callId,
              timestamp: new Date().toISOString()
            });
            return;
          }

          // Check if call is still ringable
          const ringingParty = session.parties?.find(p => 
            ['Setup', 'Proceeding'].includes(p.status?.code)
          );

          if (!ringingParty) {
            console.log(`⚠️ [${socket.id}] Call not in ringable state`);
            io.emit("call-ended", { 
              callId: data.callId,
              reason: 'call_not_ringing',
              timestamp: new Date().toISOString()
            });
            return;
          }

        } catch (sessionError) {
          console.error(`❌ [${socket.id}] Failed to get session:`, sessionError.message);
        }
        
        // Make RingCentral API call to answer
        await platform.post(
          `/restapi/v1.0/account/~/telephony/sessions/${data.callId}/parties/${data.partyId}/answer`
        );
        
        console.log(`✅ [${socket.id}] Call answered successfully`);
        
        // Emit to ALL clients that call is active
        io.emit("call-active", { 
          callId: data.callId,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`❌ [${socket.id}] Failed to answer call:`, error.response?.data || error.message);
        
        // Handle specific error cases
        if (error.response?.status === 400) {
          console.log(`⚠️ [${socket.id}] Bad request - call might be already answered or ended`);
          
          // Try to get call state to determine what to emit
          try {
            const platform = getPlatform();
            const sessionRes = await platform.get(
              `/restapi/v1.0/account/~/telephony/sessions/${data.callId}`
            );
            const session = await sessionRes.json();
            
            const activeParty = session.parties?.find(p => 
              ['Answered', 'Connected'].includes(p.status?.code)
            );

            if (activeParty) {
              console.log(`⚠️ [${socket.id}] Call is already active`);
              io.emit("call-active", { 
                callId: data.callId,
                timestamp: new Date().toISOString()
              });
            } else {
              console.log(`⚠️ [${socket.id}] Call is not active, emitting ended`);
              io.emit("call-ended", { 
                callId: data.callId,
                timestamp: new Date().toISOString()
              });
            }
          } catch (e) {
            // If we can't get session, assume call ended
            io.emit("call-ended", { 
              callId: data.callId,
              timestamp: new Date().toISOString()
            });
          }
        } else if (error.response?.status === 404) {
          console.log(`⚠️ [${socket.id}] Call not found, emitting ended`);
          io.emit("call-ended", { 
            callId: data.callId,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    // ❌ END CALL HANDLER
    socket.on("end-call", async (data) => {
      console.log(`❌ [${socket.id}] END CALL:`, data);
      
      try {
        await refreshTokenIfNeeded();
        const platform = getPlatform();
        
        // Get the session to find active party
        const sessionRes = await platform.get(
          `/restapi/v1.0/account/~/telephony/sessions/${data.callId}`
        );
        
        const session = await sessionRes.json();
        console.log(`📊 [${socket.id}] Session details:`, {
          parties: session.parties?.length,
          status: session.parties?.[0]?.status?.code
        });
        
        // Find the active party
        const activeParty = session.parties?.find(p => 
          ['Setup', 'Proceeding', 'Answered', 'Connected', 'OnHold'].includes(p.status?.code)
        );
        
        if (activeParty) {
          // Drop the call
          await platform.delete(
            `/restapi/v1.0/account/~/telephony/sessions/${data.callId}/parties/${activeParty.id}`
          );
          console.log(`✅ [${socket.id}] Call ended successfully`);
        } else {
          console.log(`⚠️ [${socket.id}] No active party found for call`);
        }
        
        // Emit to ALL clients that call ended
        io.emit("call-ended", { 
          callId: data.callId,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`❌ [${socket.id}] Failed to end call:`, error.response?.data || error.message);
        
        // If call not found (404), still emit ended
        if (error.response?.status === 404) {
          console.log(`⚠️ [${socket.id}] Call not found, emitting ended`);
          io.emit("call-ended", { 
            callId: data.callId,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    // 🔇 MUTE CALL HANDLER
    socket.on("mute-call", async (data) => {
      console.log(`🔇 [${socket.id}] MUTE CALL:`, data);
      
      try {
        await refreshTokenIfNeeded();
        const platform = getPlatform();
        
        if (data.muted) {
          await platform.post(
            `/restapi/v1.0/account/~/telephony/sessions/${data.callId}/parties/${data.partyId}/mute`
          );
        } else {
          await platform.post(
            `/restapi/v1.0/account/~/telephony/sessions/${data.callId}/parties/${data.partyId}/unmute`
          );
        }
        
        console.log(`✅ [${socket.id}] Call ${data.muted ? 'muted' : 'unmuted'}`);
        
        // Broadcast mute status to ALL clients
        io.emit("call-updated", {
          callId: data.callId,
          muted: data.muted,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`❌ [${socket.id}] Failed to toggle mute:`, error.response?.data || error.message);
      }
    });

    // ⏸️ HOLD CALL HANDLER
    socket.on("hold-call", async (data) => {
      console.log(`⏸️ [${socket.id}] HOLD CALL:`, data);
      
      try {
        await refreshTokenIfNeeded();
        const platform = getPlatform();
        
        if (data.hold) {
          await platform.post(
            `/restapi/v1.0/account/~/telephony/sessions/${data.callId}/parties/${data.partyId}/hold`
          );
        } else {
          await platform.post(
            `/restapi/v1.0/account/~/telephony/sessions/${data.callId}/parties/${data.partyId}/unhold`
          );
        }
        
        console.log(`✅ [${socket.id}] Call ${data.hold ? 'held' : 'resumed'}`);
        
        // Broadcast hold status to ALL clients
        io.emit("call-updated", {
          callId: data.callId,
          hold: data.hold,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`❌ [${socket.id}] Failed to toggle hold:`, error.response?.data || error.message);
      }
    });

    // Log all incoming events (your existing debug)
    socket.onAny((event, ...args) => {
      console.log(`📨 Socket Event [${socket.id}]: ${event}`, args);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Client disconnected:", socket.id, "Reason:", reason);
      console.log("👥 Remaining clients:", io.engine.clientsCount);
    });

    socket.on("error", (error) => {
      console.error("⚠️ Socket error:", socket.id, error);
    });
  });

  console.log("🔌 Socket.IO initialized with call control handlers");
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

module.exports = { initSocket, getIO };