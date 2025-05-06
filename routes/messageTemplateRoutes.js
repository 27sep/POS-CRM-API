const express = require('express');
const router = express.Router();
const messageHistoryController = require('../controllers/messageTemplateController');

// Create a new message history entry
router.post('/create', messageHistoryController.createMessageTemplate);

// Get all message history entries
router.get('/all', messageHistoryController.getAllMessageTemplates);

// Get a specific message history entry by ID
router.get('/get/:id', messageHistoryController.getAllMessageTemplates);

// Update a message history entry
router.put('/update/:id', messageHistoryController.updateMessageTemplate);

// Delete a message history entry
router.delete('/delete/:id', messageHistoryController.deleteMessageTemplate);

module.exports = router;
