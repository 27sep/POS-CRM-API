// utils/socket.js - With improved error handling and call keep-alive
const { Server } = require("socket.io");
const { getPlatform } = require("../config/ringcentral");
const { refreshTokenIfNeeded } = require("../config/ringcentral");

let io;

// Store active calls to monitor them
const activeCalls = new Map();

// Function to keep call alive by sending silent audio or checking status
const keepCallAlive = async (callId, partyId) => {
  try {
    const platform = getPlatform();
    
    // Check call status periodically
    const sessionRes = await platform.get(
      `/restapi/v1.0/account/~/telephony/sessions/${callId}`
    );
    const session = await sessionRes.json();
    
    const activeParty = session.parties?.find(p => 
      ['Answered', 'Connected'].includes(p.status?.code)
    );
    
    if (!activeParty) {
      console.log(`⚠️ Call ${callId} no longer active, stopping keep-alive`);
      activeCalls.delete(callId);
      io.emit("call-ended", { 
        callId, 
        reason: 'call_ended',
        timestamp: new Date().toISOString()
      });
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Keep-alive check failed for ${callId}:`, error.message);
    if (error.response?.status === 404) {
      activeCalls.delete(callId);
      io.emit("call-ended", { 
        callId, 
        reason: 'call_not_found',
        timestamp: new Date().toISOString()
      });
      return false;
    }
    return true;
  }
};

// Start monitoring a call
const startCallMonitoring = (callId, partyId) => {
  if (activeCalls.has(callId)) return;
  
  console.log(`📊 Starting call monitoring for ${callId}`);
  activeCalls.set(callId, partyId);
  
  // Check call status every 10 seconds
  const interval = setInterval(async () => {
    const isAlive = await keepCallAlive(callId, partyId);
    if (!isAlive) {
      clearInterval(interval);
    }
  }, 10000);
  
  // Store interval to clear later
  activeCalls.set(`${callId}_interval`, interval);
};

// Stop monitoring a call
const stopCallMonitoring = (callId) => {
  const interval = activeCalls.get(`${callId}_interval`);
  if (interval) {
    clearInterval(interval);
    activeCalls.delete(`${callId}_interval`);
  }
  activeCalls.delete(callId);
  console.log(`📊 Stopped monitoring call ${callId}`);
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // In production, change this to your frontend URL
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['polling', 'websocket'] // Polling first for better compatibility
  });

  // Debug all socket events
  io.on("connection", (socket) => {
    console.log("📞 Client connected:", socket.id);
    console.log("🌍 Client origin:", socket.handshake.headers.origin);
    console.log("🔌 Transport:", socket.conn.transport.name);
    console.log("👥 Total clients:", io.engine.clientsCount);

    // 📞 ANSWER CALL HANDLER - FIXED VERSION
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
            
            // Start monitoring the call
            startCallMonitoring(data.callId, activeParty.id);
            
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

          // Make RingCentral API call to answer
          await platform.post(
            `/restapi/v1.0/account/~/telephony/sessions/${data.callId}/parties/${data.partyId}/answer`
          );
          
          console.log(`✅ [${socket.id}] Call answered successfully`);
          
          // 🔴 CRITICAL FIX: Start monitoring the call immediately
          startCallMonitoring(data.callId, data.partyId);
          
          // Also start a "silent recording" or "whisper" to keep audio path
          try {
            // Option 1: Start recording (keeps call alive)
            await platform.post(
              `/restapi/v1.0/account/~/telephony/sessions/${data.callId}/parties/${data.partyId}/recordings`
            ).catch(e => console.log("Recording start error:", e.message));
            
            // Option 2: Play a silent tone (if available)
            // This requires media server capabilities
            
            console.log(`🎵 Started keep-alive mechanisms for call ${data.callId}`);
          } catch (keepAliveError) {
            console.log(`⚠️ Keep-alive error:`, keepAliveError.message);
          }
          
          // Emit to ALL clients that call is active
          io.emit("call-active", { 
            callId: data.callId,
            timestamp: new Date().toISOString()
          });
          
        } catch (sessionError) {
          console.error(`❌ [${socket.id}] Failed to get session:`, sessionError.message);
        }
        
      } catch (error) {
        const errMsg = error.response?.data?.message || error.response?.data?.errorDescription || error.message || "Unknown error";
        const errStatus = error.response?.status;
        console.error(`❌ [${socket.id}] Failed to answer call:`, error.response?.data || error.message);

        const emitAnswerFailed = (message) => {
          io.emit("answer-failed", {
            callId: data.callId,
            error: message,
            timestamp: new Date().toISOString()
          });
        };

        // Handle specific error cases
        if (errStatus === 400) {
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
              
              // Start monitoring
              startCallMonitoring(data.callId, activeParty.id);
              
              io.emit("call-active", { 
                callId: data.callId,
                timestamp: new Date().toISOString()
              });
            } else {
              console.log(`⚠️ [${socket.id}] Call is not active, emitting answer-failed`);
              emitAnswerFailed(errMsg || "Call could not be answered. It may have ended or the device may be offline.");
            }
          } catch (e) {
            emitAnswerFailed(errMsg || "Could not answer call.");
          }
        } else if (errStatus === 404) {
          console.log(`⚠️ [${socket.id}] Call not found`);
          emitAnswerFailed("Call not found or already ended.");
        } else {
          // Any other error (e.g. 503, WebRTC device offline, network)
          emitAnswerFailed(errMsg);
        }
      }
    });

    // ❌ END CALL HANDLER
    socket.on("end-call", async (data) => {
      console.log(`❌ [${socket.id}] END CALL:`, data);
      
      try {
        await refreshTokenIfNeeded();
        const platform = getPlatform();
        
        // Stop monitoring
        stopCallMonitoring(data.callId);
        
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
      } finally {
        // Always stop monitoring
        stopCallMonitoring(data.callId);
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

    // 🔴 NEW: Keep-alive ping from client
    socket.on("call-keep-alive", ({ callId }) => {
      // Just log, call is still active
      if (activeCalls.has(callId)) {
        console.log(`💓 Keep-alive ping for call ${callId}`);
      }
    });

    // Log all incoming events
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

  // Clean up old calls periodically
  setInterval(() => {
    const now = Date.now();
    // This would need more sophisticated cleanup
  }, 60000);

  console.log("🔌 Socket.IO initialized with call control handlers and keep-alive");
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

module.exports = { initSocket, getIO };