const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { receiveSms } = require('../controllers/smsController');

// Parse form-encoded (Twilio webhook sends like this)
router.use(bodyParser.urlencoded({ extended: false }));

router.post('/incoming', receiveSms);

module.exports = router;
