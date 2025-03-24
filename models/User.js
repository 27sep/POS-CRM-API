// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'sales_manager'], required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  is_active: { type: Boolean, default: true },
  reset_token: { type: String },
  reset_token_expires: { type: Date },
  login_token: { type: String },
  last_login: { type: Date }
});

module.exports = mongoose.model('User', UserSchema);