// app.js
const express = require('express');
const connectDB = require('./config/db');
require('dotenv').config();

// Initialize app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
const authRoutes = require('./routes/authRoutes');
const campaignType = require('./routes/campaignTypesRoutes')
const campaign = require('./routes/campaignRoutes')
const campaignLead = require('./routes/campaignLeadRoutes')
const leadRoutes = require('./routes/leadRoutes');
const campaignAnalyticsRoutes = require('./routes/campaignAnalyticsRoutes');
const leadActivityRoutes = require('./routes/leadActivityRoutes');
const leadPipelineRoutes = require("./routes/leadPipelineRoutes");
const messageTemplate = require("./routes/messageTemplateRoutes");
const messageHistory = require("./routes/messageHistoryRoutes");
const salesTeamRoutes = require("./routes/salesTeamRoutes");
const emailRoutes = require('./routes/email.routes');


app.use('/api/auth', authRoutes);
app.use('/api/campaign-types',campaignType)
app.use('/api/campaigns',campaign)
app.use('/api/campaign-leads',campaignLead)
app.use('/api/leads', leadRoutes);
app.use('/api/campaign-analytics', campaignAnalyticsRoutes);
app.use('/api/lead-activities', leadActivityRoutes);
app.use("/api/lead-pipeline", leadPipelineRoutes);
app.use("/api/message-templates", messageTemplate);
app.use("/api/message-history", messageHistory);
app.use("/api/sales-teams", salesTeamRoutes);
app.use('/api/email', emailRoutes)




// Basic route
app.get('/', (req, res) => res.send('API is running...'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Something went wrong!' });
});

module.exports = app;