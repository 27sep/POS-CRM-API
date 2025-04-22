const transporter = require('../config/mailConfig');
const welcomeTemplate = require("../templates/welcomeTemplate");

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

const sendBulkMail = async (recipients = [], subject, firstNames) => {
  try {
    const results = [];
    
    // Loop through each recipient and send email
    for (let i = 0; i < recipients.length; i++) {
      const email = recipients[i];
      const firstName = firstNames[i]; // Assuming firstNames is an array of first names

      // Generate the email content using the template
      const htmlContent = welcomeTemplate(firstName);

      // Send email
      const info = await transporter.sendMail({
        from: `"CRM App" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        html: htmlContent,
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
