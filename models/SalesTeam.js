// models/SalesTeam.js
const mongoose = require('mongoose');

const SalesTeamSchema = new mongoose.Schema({
    team_name: { type: String, required: true },
    manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now }
  });
  
  module.exports = mongoose.model('SalesTeam', SalesTeamSchema);