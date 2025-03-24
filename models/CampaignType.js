// models/CampaignType.js
const mongoose = require('mongoose');

const CampaignTypeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
  });
  
  module.exports = mongoose.model('CampaignType', CampaignTypeSchema);
  