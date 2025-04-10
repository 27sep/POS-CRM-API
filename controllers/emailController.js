const {sendMail} = require('../utils/mailer');
const { sendBulkMail } = require('../utils/mailer');
const fetchIncomingReplies = require('../utils/mailFetcher');

const sendTestEmail = async (req, res) => {
  const { to, subject, message } = req.body;
  try {
    await sendMail(to, subject, `<p>${message}</p>`);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email' });
  }
};

const bulkEmailController = async (req, res) => {
  const { recipients, subject, message } = req.body;

  try {
    const html = `<p>${message}</p>`;
    const result = await sendBulkMail(recipients, subject, html);

    res.status(200).json({
      success: true,
      message: "Emails sent successfully",
      result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to send bulk emails",
    });
  }
};

const getReplies = async (req, res) => {
  try {
    await fetchIncomingReplies();
    res.json({ success: true, message: 'Fetched and logged replies' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch replies' });
  }
};


module.exports = { sendTestEmail,bulkEmailController,getReplies };
