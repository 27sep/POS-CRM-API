const express = require('express');
const router = express.Router();
const messageHistoryController = require('../controllers/messageHistoryController');

// Create a new message history entry
router.post('/create', messageHistoryController.createMessageHistory);

// Get all message history entries
router.get('/all', messageHistoryController.getAllMessageHistories);

// Get a specific message history entry by ID
router.get('/get/:id', messageHistoryController.getMessageHistoryById);

// Update a message history entry
router.put('/update/:id', messageHistoryController.updateMessageHistory);

// Delete a message history entry
router.delete('/delete/:id', messageHistoryController.deleteMessageHistory);

module.exports = router;
