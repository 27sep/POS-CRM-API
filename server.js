// server.js
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log('🚀 Starting server initialization...');
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    // 1️⃣ Start Express server first (critical)
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`➡️  Local: http://localhost:${PORT}`);
      console.log(`🌍 Network: http://0.0.0.0:${PORT}`);
      console.log('✅ Express server started successfully');
    });

    // 2️⃣ Initialize RingCentral in background (non-critical)
    setTimeout(async () => {
      try {
        const { loginRingCentral } = require('./config/ringcentral');
        await loginRingCentral();
        console.log('✅ RingCentral connected successfully');
        
        // Start cron jobs after RingCentral is ready
        try {
          const startFetchRepliesJob = require('./cronJobs/fetchRepliesCron');
          if (typeof startFetchRepliesJob === 'function') {
            startFetchRepliesJob();
            console.log('🕒 Cron job for fetching replies started');
          }
        } catch (cronError) {
          console.warn('⚠️ Cron job setup failed:', cronError.message);
        }
        
      } catch (rcError) {
        console.error('❌ RingCentral initialization failed, but server is running');
        console.error('💡 SMS features will not work until RingCentral is configured');
      }
    }, 2000);

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
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();