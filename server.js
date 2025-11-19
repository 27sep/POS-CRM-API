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

    // 3️⃣ Start Express server - CRITICAL FIX: Listen on 0.0.0.0
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`➡️  Local: http://localhost:${PORT}`);
      console.log(`🌍 Network: http://0.0.0.0:${PORT}`);
      console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
      });
    });

  } catch (error) {
    console.error('❌ Error during server startup:', error.message);
    process.exit(1);
  }
}

startServer();