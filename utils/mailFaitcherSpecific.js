const imaps = require('imap-simple');
const MailReply = require('../models/MailReply');
require('dotenv').config();

const config = {
  imap: {
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 5000,
  },
};

// 🔍 Define filter criteria
const ALLOWED_SENDERS = ['example1@gmail.com', 'example2@gmail.com'];
const SUBJECT_KEYWORDS = ['Reset Password', 'Reply to CRM'];

const fetchIncomingReplies = async () => {
  try {
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');
    console.log('📥 Connected to INBOX');

    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)', 'TEXT'],
      markSeen: true,
    };

    const results = await connection.search(searchCriteria, fetchOptions);

    for (const mail of results) {
      const header = mail.parts.find(p => p.which.includes('HEADER'));
      const body = mail.parts.find(p => p.which === 'TEXT');

      const from = header.body.from?.[0] || '';
      const subject = header.body.subject?.[0] || '';
      const date = new Date(header.body.date?.[0]);
      const message = body.body;

      // 🔍 Filter by sender or subject
      const isFromAllowed = ALLOWED_SENDERS.some(sender => from.includes(sender));
      const isSubjectMatch = SUBJECT_KEYWORDS.some(keyword => subject.includes(keyword));

      if (isFromAllowed || isSubjectMatch) {
        const saved = await MailReply.create({
          from,
          subject,
          body: message,
          date,
          raw: JSON.stringify(mail),
        });
        console.log(`💾 Saved reply from ${from} with subject "${subject}"`);
      } else {
        console.log(`❌ Skipped: from ${from} with subject "${subject}"`);
      }
    }

    connection.end();
  } catch (error) {
    console.error('❌ Error fetching/saving replies:', error.message);
  }
};

module.exports = fetchIncomingReplies;
