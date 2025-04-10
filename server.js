
const app = require('./app');
const startFetchRepliesJob = require('./cronJobs/fetchRepliesCron');

const PORT = process.env.PORT || 5000;

startFetchRepliesJob();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
