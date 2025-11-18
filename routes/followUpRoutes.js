const express = require('express');
const router = express.Router();
const FollowUpController = require('../controllers/followUpController');
const { authMiddleware } = require('../middlewares/authMiddleware'); // ✅ destructure

// Get all follow-ups for a user
router.get('/users/:userId/follow-ups', FollowUpController.getUserFollowUps);

// Create a new follow-up
router.post('/campaign-leads/:campaignLeadId/follow-ups', authMiddleware, FollowUpController.createFollowUp);

// Complete a follow-up
router.put('/follow-ups/:followUpId/complete', FollowUpController.completeFollowUp);

module.exports = router;
