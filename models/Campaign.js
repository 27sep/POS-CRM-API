// models/Campaign.js
const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
    creator_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    campaign_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CampaignType', required: true },
    name: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['draft', 'published', 'completed'], default: 'draft' },
    type: { type: String, enum: ['standard', 'custom'], default: 'standard' },
    start_date: { type: Date },
    end_date: { type: Date },
    campaign_settings: { type: Object },
    budget: { type: Number, default: 0 },
    target_audience: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  });
  
  module.exports = mongoose.model('Campaign', CampaignSchema);