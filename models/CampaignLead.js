// models/CampaignLead.js
const mongoose = require('mongoose');

const CampaignLeadSchema = new mongoose.Schema({
    campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    status: { type: String, enum: ['new', 'contacted', 'converted', 'dead'], default: 'new' },
    response: { type: String, enum: ['yes', 'no', 'later'], default: 'no' },
    added_at: { type: Date, default: Date.now },
    last_contacted: { type: Date },
    follow_up_date: { type: Date },
    messages_sent: { type: Number, default: 0 },
    total_interactions: { type: Number, default: 0 }
  });
  
  module.exports = mongoose.model('CampaignLead', CampaignLeadSchema);