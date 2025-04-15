const mongoose = require('mongoose');

const smsReplySchema = new mongoose.Schema({
  from: String,
  to: String,
  body: String,
  date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('SMSReply', smsReplySchema);
