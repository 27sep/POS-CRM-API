const transporter = require('../config/mailConfig');

const sendMail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"CRM App" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    // console.log(' Email sent:', info);
    return info;
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
};

const sendBulkMail = async (recipients = [], subject, html) => {
  try {
    const results = [];
    for (const email of recipients) {
      const info = await transporter.sendMail({
        from: `"CRM App" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        html,
      });
      results.push({ email, messageId: info.messageId });
    }
    return results;
  } catch (err) {
    console.error('Error sending bulk emails:', err);
    throw err;
  }
};

module.exports = { sendMail, sendBulkMail };
