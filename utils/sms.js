const twilioClient = require("../config/twilio");

const sendSMS = async (to, body) => {
  try {
    const message = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log(`SMS sent to ${to}: ${message.sid}`);
    return message;
  } catch (err) {
    console.error(`Error sending SMS to ${to}:`, err.message);
    throw err;
  }
};

const sendBulkSMS = async (recipients = [], body) => {
  const results = [];

  for (const number of recipients) {
    try {
      const response = await sendSMS(number, body);
      results.push({ to: number, sid: response.sid });
    } catch (err) {
      results.push({ to: number, error: err.message });
    }
  }

  return results;
};

module.exports = {
  sendSMS,
  sendBulkSMS,
};
