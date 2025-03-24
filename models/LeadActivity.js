// models/LeadActivity.js
const mongoose = require('mongoose');

const LeadActivitySchema = new mongoose.Schema({
    lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    activity_type: { type: String, enum: ['call', 'email', 'meeting', 'note'], required: true },
    notes: { type: String },
    activity_date: { type: Date, default: Date.now }
  });
  
  module.exports = mongoose.model('LeadActivity', LeadActivitySchema);