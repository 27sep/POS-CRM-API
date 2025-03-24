// routes/campaignAnalyticsRoutes.js
const express = require('express');
const router = express.Router();
const campaignAnalyticsController = require('../controllers/campaignAnalyticsController');

// Create campaign analytics entry
router.post('/create', campaignAnalyticsController.createCampaignAnalytics);

// Get all campaign analytics
router.get('/all', campaignAnalyticsController.getAllCampaignAnalytics);

// Get analytics by campaign ID
router.get('/get/:id', campaignAnalyticsController.getCampaignAnalyticsById);

// Update campaign analytics
router.put('/update/:id', campaignAnalyticsController.updateCampaignAnalytics);

// Delete campaign analytics entry
router.delete('/delete/:id', campaignAnalyticsController.deleteCampaignAnalytics);

module.exports = router;
