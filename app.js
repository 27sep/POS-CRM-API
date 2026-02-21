// app.js
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
require('dotenv').config();

// Import RingCentral configuration and login function
const { loginRingCentral } = require('./config/ringcentral');

// Initialize app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://www.clydios.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
const authRoutes = require('./routes/authRoutes');
const campaignTypeRoutes = require('./routes/campaignTypesRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const campaignLeadRoutes = require('./routes/campaignLeadRoutes');
const leadRoutes = require('./routes/leadRoutes');
const campaignAnalyticsRoutes = require('./routes/campaignAnalyticsRoutes');
const leadActivityRoutes = require('./routes/leadActivityRoutes');
const leadPipelineRoutes = require("./routes/leadPipelineRoutes");
const messageTemplateRoutes = require("./routes/messageTemplateRoutes");
const messageHistoryRoutes = require("./routes/messageHistoryRoutes");
const salesTeamRoutes = require("./routes/salesTeamRoutes");
const emailRoutes = require('./routes/email.routes');
const smsRoutes = require('./routes/smsRoutes');
const followUpRoutes = require('./routes/followUpRoutes');
const scrapingRoutes = require('./routes/scrapingRoutes');
const apolloPersonRoutes = require('./routes/apolloPersonRoutes');
const ringcentralRoutes = require('./routes/ringcentralRoutes');
const ringCentralSMSRoutes = require('./routes/ringCentralSMSRoutes');
const userRoutes = require('./routes/userRoutes');
const ringcentralWebhookRoutes = require("./routes/ringcentralWebhookRoutes");
const callRoutes = require('./routes/callRoutes');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/campaign-types', campaignTypeRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/campaign-leads', campaignLeadRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/campaign-analytics', campaignAnalyticsRoutes);
app.use('/api/lead-activities', leadActivityRoutes);
app.use("/api/lead-pipeline", leadPipelineRoutes);
app.use("/api/message-templates", messageTemplateRoutes);
app.use("/api/message-history", messageHistoryRoutes);
app.use("/api/sales-teams", salesTeamRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/scraping', scrapingRoutes);
app.use('/api/apollo-person', apolloPersonRoutes);
app.use('/api/users', userRoutes);
app.use("/test", require("./routes/testSocket"));
// ================= RINGCENTRAL =================

// 1️⃣ Webhook FIRST (no JWT)
app.use("/api/ringcentral", ringcentralWebhookRoutes);

// 2️⃣ Normal RingCentral APIs (JWT protected inside route file)
app.use('/api/ringcentral', ringcentralRoutes);

// 3️⃣ SMS APIs
app.use('/api/ringcentral/sms', ringCentralSMSRoutes);
app.use('/api/calls', callRoutes);

// Health check route (REQUIRED for Render)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'RingCentral CRM API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      ringcentral: '/api/ringcentral',
      sms: '/api/ringcentral/sms',
      health: '/health'
    }
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.stack);
  res.status(500).json({
    success: false,
    code: 'SERVER_ERROR',
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;