const express = require('express');
const { sendTestEmail,bulkEmailController,getReplies } = require('../controllers/emailController');

const router = express.Router();

router.post('/send-email', sendTestEmail);
router.post('/send-bulk-email', bulkEmailController);
router.get('/fetch-replies', getReplies);

module.exports = router;
