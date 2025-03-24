// models/MessageTemplate.js
const mongoose = require('mongoose');

const MessageTemplateSchema = new mongoose.Schema({
    campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    name: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['email', 'push', 'sms'], required: true },
    variables: { type: Object },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
  });
  
  module.exports = mongoose.model('MessageTemplate', MessageTemplateSchema);