const cron = require('node-cron');
const fetchIncomingReplies = require('../utils/mailFetcher');

const startFetchRepliesJob = () => {
  // Run once daily at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Daily fetchReplies cron job triggered...');
    await fetchIncomingReplies();
  });
};

module.exports = startFetchRepliesJob;
