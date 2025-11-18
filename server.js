// server.js
require('dotenv').config();
const app = require('./app');
const startFetchRepliesJob = require('./cronJobs/fetchRepliesCron');
const { loginRingCentral } = require('./config/ringcentral');

const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log('🚀 Starting server initialization...');

  try {
    // 1️⃣ Initialize RingCentral connection
    await loginRingCentral();
    console.log('✅ RingCentral connected successfully');

    // 2️⃣ Start background/cron jobs (if available)
    if (typeof startFetchRepliesJob === 'function') {
      startFetchRepliesJob();
      console.log('🕒 Cron job for fetching replies started');
    } else {
      console.warn('⚠️ No cron job found for fetchRepliesCron');
    }

    // 3️⃣ Start Express server
    app.listen(PORT, () => {
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`➡️  Visit: http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Error during server startup:', error.message);
    process.exit(1); // Stop the process if initialization fails
  }
}

startServer();
