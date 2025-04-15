const SMSReply = require('../models/SMSReply');

const receiveSms = async (req, res) => {
  const { From, To, Body } = req.body;

  try {
    // Save incoming message to MongoDB
    await SMSReply.create({
      from: From,
      to: To,
      body: Body,
    });

    // Respond to Twilio
    res.set('Content-Type', 'text/xml');
    res.send(`<Response><Message>Thanks! We received your message.</Message></Response>`);
  } catch (error) {
    console.error('Error saving SMS reply:', error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = { receiveSms };
