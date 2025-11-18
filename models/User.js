// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },

  // ROLE: admin or sales_manager
  role: { 
    type: String, 
    enum: ['admin', 'sales_manager'], 
    required: true 
  },

  // 👉 Manager will only see calls/messages of these numbers
  assigned_numbers: [{ type: String, default: [] }],

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  is_active: { type: Boolean, default: true },

  reset_token: { type: String },
  reset_token_expires: { type: Date },

  login_token: { type: String },
  last_login: { type: Date }
});

// Auto update updated_at on each save
UserSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('User', UserSchema);
