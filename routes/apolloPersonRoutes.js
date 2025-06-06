const express = require('express');
const router = express.Router();
const personController = require('../controllers/apolloPersonController');



// Get all people (with optional pagination query params)
router.get('/sync-people', personController.fetchAndSavePeople);


module.exports = router;