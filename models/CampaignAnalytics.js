// models/CampaignAnalytics.js
const mongoose = require('mongoose');

const CampaignAnalyticsSchema = new mongoose.Schema({
    campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    total_leads: { type: Number, default: 0 },
    converted_leads: { type: Number, default: 0 },
    conversion_rate: { type: Number, default: 0 },
    total_messages_sent: { type: Number, default: 0 },
    yes_responses: { type: Number, default: 0 },
    no_responses: { type: Number, default: 0 },
    later_responses: { type: Number, default: 0 },
    metrics: { type: Object },
    record_date: { type: Date, default: Date.now }
  });
  
  module.exports = mongoose.model('CampaignAnalytics', CampaignAnalyticsSchema);