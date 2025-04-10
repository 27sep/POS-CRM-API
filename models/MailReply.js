const mongoose = require('mongoose');

const mailReplySchema = new mongoose.Schema({
  from: String,
  subject: String,
  body: String,
  date: Date,
  raw: String, // optional: full raw message
}, { timestamps: true });

module.exports = mongoose.model('MailReply', mailReplySchema);
