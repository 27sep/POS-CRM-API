// models/Lead.js
const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
    first_name: { type: String, required: true },
    last_name: { type: String },
    email: { type: String },
    phone: { type: String },
    company: { type: String },
    status: { type: String },
    custom_fields: { type: Object },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    last_contacted: { type: Date },
    preferred_contact: { type: String, enum: ['email', 'message', 'call'] },
    source: { type: String },
    lead_score: { type: Number, default: 0 }
  });
  
  module.exports = mongoose.model('Lead', LeadSchema);