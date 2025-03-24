// models/LeadPipeline.js
const mongoose = require('mongoose');

const LeadPipelineSchema = new mongoose.Schema({
  campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  stage_name: { type: String, required: true },
  stage_order: { type: Number, required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LeadPipeLineSchema', LeadPipelineSchema);