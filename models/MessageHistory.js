// models/MessageHistory.js
const mongoose = require('mongoose');

const MessageHistorySchema = new mongoose.Schema({
    campaign_lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CampaignLead', required: true },
    template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MessageTemplate' },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['email', 'push', 'sms'] },
    content: { type: String },
    status: { type: String, enum: ['sent', 'delivered', 'failed'] },
    response: { type: String, enum: ['yes', 'no', 'later'] },
    sent_at: { type: Date },
    response_at: { type: Date },
    response_notes: { type: String }
  });
  
  module.exports = mongoose.model('MessageHistory', MessageHistorySchema);