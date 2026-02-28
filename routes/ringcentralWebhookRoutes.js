// routes/ringcentralWebhookRoutes.js
const express = require("express");
const router = express.Router();
const { handleCallEvent, testWebhook, simulateCall } = require("../controllers/ringcentralWebhookController");
const { getPlatform } = require("../config/ringcentral");
const { getIO } = require("../utils/socket");

// ===========================================
// 🟢 PUBLIC ENDPOINTS - NO AUTH REQUIRED
// ===========================================

// 📞 RingCentral Webhook - Receive live call events
router.post("/webhook", handleCallEvent);

// Test endpoint to verify webhook is working (GET)
router.get('/test', testWebhook);

// Simulation endpoint for testing without RingCentral (POST)
router.post('/simulate', simulateCall);


// ✅ Verify RingCentral subscription status
router.get("/verify-subscription", async (req, res) => {
  try {
    const platform = getPlatform();
    console.log("platform", platform);
    console.log("🔍 Verifying RingCentral subscription and authentication...");
    console.log("platform.auth()", platform.auth().data());

    if (!platform.auth().data().access_token) 
      {
      return res.status(401).json({
        success: false,
        message: "RingCentral not authenticated",
        hint: "Check your JWT token in .env"
      });
    }

    const resp = await platform.get('/restapi/v1.0/subscription');
    const subscriptions = await resp.json();
    console.log("subscriptions", subscriptions);
    console.log("response", resp);
    res.json({
      success: true,
      message: "RingCentral authenticated successfully",
      tokenExpiry: new Date(platform.auth().data().expire_time).toLocaleString(),
      activeSubscriptions: subscriptions.records || []
    });

  } catch (error) {
    console.error("❌ Verify subscription error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      hint: "Check your RingCentral JWT token and scopes"
    });
  }
});

// 🧪 Debug - Check webhook setup
router.get("/webhook-debug", (req, res) => {
  const webhookUrl = process.env.WEBHOOK_PUBLIC_URL
    ? `${process.env.WEBHOOK_PUBLIC_URL}/api/ringcentral/webhook`
    : "❌ Not configured - run: https://backend.clydios.com";

  res.json({
    success: true,
    message: "Webhook endpoint is ready",
    webhookUrl,
    ngrokRunning: !!process.env.WEBHOOK_PUBLIC_URL,
    ngrokUrl: process.env.WEBHOOK_PUBLIC_URL || "Not set",
    timestamp: new Date().toISOString(),
    instructions: {
      step1: "ngrok http 5000",
      step2: "Copy the https://backend.clydios.com URL",
      step3: "Add to .env: WEBHOOK_PUBLIC_URL=https://backend.clydios.com",
      step4: "Restart server: npm run dev",
      step5: "Run: curl -X POST https://backend.clydios.com/api/ringcentral/create-subscription",
      step6: "Update RingCentral Console with the same URL"
    }
  });
});

// 📝 Create webhook subscription
router.post("/create-subscription", async (req, res) => {
  try {
    const platform = getPlatform();

    if (!process.env.WEBHOOK_PUBLIC_URL) {
      return res.status(400).json({
        success: false,
        message: "WEBHOOK_PUBLIC_URL not set",
        hint: "Run 'ngrok http 5000' and add the URL to your .env file",
        example: "WEBHOOK_PUBLIC_URL=https://abc123.ngrok.io"
      });
    }

    // Validate ngrok URL format
    if (process.env.WEBHOOK_PUBLIC_URL.includes('a1b2c3d4')) {
      return res.status(400).json({
        success: false,
        message: "You are using the PLACEHOLDER ngrok URL!",
        hint: "Change 'a1b2c3d4' to your ACTUAL ngrok URL",
        currentUrl: process.env.WEBHOOK_PUBLIC_URL,
        solution: "1. Look at your ngrok terminal\n2. Find the https://xxxx.ngrok.io URL\n3. Copy that URL\n4. Update your .env file\n5. Restart your server"
      });
    }

    const webhookUrl = `${process.env.WEBHOOK_PUBLIC_URL}/api/ringcentral/webhook`;
    console.log('📡 Creating webhook subscription for:', webhookUrl);

    // First, test if the webhook endpoint is reachable
    try {
      const testController = require("../controllers/ringcentralWebhookController");
      if (typeof testController !== 'undefined') {
        console.log('✅ Webhook controller loaded successfully');
      }
    } catch (e) {
      console.error('❌ Webhook controller not found:', e.message);
    }

    // Delete existing subscriptions
    try {
      const listResp = await platform.get('/restapi/v1.0/subscription');
      const subs = await listResp.json();
      if (subs.records && subs.records.length > 0) {
        console.log(`🗑️ Found ${subs.records.length} existing subscription(s)`);
        for (const sub of subs.records) {
          await platform.delete(`/restapi/v1.0/subscription/${sub.id}`);
          console.log(`Deleted subscription: ${sub.id}`);
        }
      } else {
        console.log('📭 No existing subscriptions found');
      }
    } catch (e) {
      console.log('📭 No existing subscriptions to delete');
    }

    // Create new subscription
    const subscription = {
      eventFilters: [
        '/restapi/v1.0/account/~/extension/~/telephony/sessions'
      ],
      deliveryMode: {
        transportType: 'WebHook',
        address: webhookUrl
      },
    };

    console.log('📦 Submitting subscription request to RingCentral...');
    const resp = await platform.post('/restapi/v1.0/subscription', subscription);
    const data = await resp.json();

    console.log('✅ Subscription created successfully!');
    console.log(`   📋 ID: ${data.id}`);
    console.log(`   📡 URL: ${data.deliveryMode.address}`);
    console.log(`   ⏰ Expires: ${new Date(data.expirationTime).toLocaleString()}`);

    res.json({
      success: true,
      message: "✅ Webhook subscription created successfully!",
      subscription: {
        id: data.id,
        url: data.deliveryMode.address,
        expires: new Date(data.expirationTime).toLocaleString(),
        filters: data.eventFilters,
        creationTime: new Date().toISOString()
      },
      ngrokUrl: process.env.WEBHOOK_PUBLIC_URL,
      important: "Make sure this EXACT URL is also set in RingCentral Console → Outbound Webhook URL"
    });
  } catch (error) {
    console.error("❌ Create subscription error:", error.message);

    // Check for specific error types
    if (error.message.includes('404')) {
      res.status(500).json({
        success: false,
        message: "WebHook responds with incorrect HTTP status. HTTP status is 404",
        hint: "Your ngrok URL is incorrect or not running",
        currentUrl: process.env.WEBHOOK_PUBLIC_URL,
        solution: [
          "1. Check if ngrok is running: 'ps aux | grep ngrok'",
          "2. If not running, start it: 'ngrok http 5000'",
          "3. Copy the HTTPS URL from ngrok terminal",
          `4. Update .env: WEBHOOK_PUBLIC_URL=https://YOUR_ACTUAL_URL.ngrok.io`,
          "5. Update RingCentral Console with the SAME URL",
          "6. Restart server: 'npm run dev'",
          "7. Try again"
        ]
      });
    } else if (error.message.includes('403') || error.message.includes('Insufficient')) {
      res.status(500).json({
        success: false,
        message: error.message,
        hint: "Missing required scopes. Add these in RingCentral Developer Console:",
        requiredScopes: [
          "Webhook Subscriptions",
          "Telephony Sessions (Read)",
          "Telephony Sessions (WebSocket)",
          "Call Control"
        ]
      });
    } else {
      res.status(500).json({
        success: false,
        message: error.message,
        hint: "Make sure you have Webhook Subscriptions scope enabled and your ngrok URL is correct",
        currentWebhookUrl: process.env.WEBHOOK_PUBLIC_URL ? `${process.env.WEBHOOK_PUBLIC_URL}/api/ringcentral/webhook` : 'Not set'
      });
    }
  }
});

// 🧪 Test - Simulate incoming call (for testing popup)
router.post("/webhook-test", async (req, res) => {
  try {
    const io = getIO();
    const { from, name, to } = req.body;

    const testCall = {
      callId: `TEST_${Date.now()}`,
      from: from || "+12524081137",
      callerName: name || "WIRELESS CALLER",
      to: to || "+18772004944",
      status: "ringing",
      timestamp: new Date().toISOString()
    };

    console.log("🧪 Emitting test incoming call:", testCall);
    console.log("📊 Active socket clients:", io.engine?.clientsCount || 0);

    io.emit("incoming-call", testCall);

    res.json({
      success: true,
      message: "Test call emitted",
      call: testCall,
      socketConnections: io.engine?.clientsCount || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Test webhook error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: "Check that Socket.IO is initialized"
    });
  }
});

// GET version of test (easier for browser testing)
router.get("/webhook-test", async (req, res) => {
  try {
    const io = getIO();
    const { from, name, to } = req.query;

    const testCall = {
      callId: `TEST_${Date.now()}`,
      from: from || "+12524081137",
      callerName: name || "WIRELESS CALLER",
      to: to || "+18772004944",
      status: "ringing",
      timestamp: new Date().toISOString()
    };

    console.log("🧪 Emitting test incoming call (GET):", testCall);
    console.log("📊 Active socket clients:", io.engine?.clientsCount || 0);

    io.emit("incoming-call", testCall);

    res.json({
      success: true,
      message: "Test call emitted",
      call: testCall,
      socketConnections: io.engine?.clientsCount || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Test webhook error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔍 Health check for webhook endpoint
router.get("/webhook-health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    webhookUrl: process.env.WEBHOOK_PUBLIC_URL
      ? `${process.env.WEBHOOK_PUBLIC_URL}/api/ringcentral/webhook`
      : "Not configured",
    ngrokRunning: !!process.env.WEBHOOK_PUBLIC_URL,
    socketIO: getIO() ? "initialized" : "not initialized",
    timestamp: new Date().toISOString(),
    reminder: "Make sure this URL matches your RingCentral Console Outbound Webhook URL!"
  });
});

module.exports = router;