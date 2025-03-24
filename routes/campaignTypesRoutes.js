const express = require('express');
const router = express.Router();
const CampaignTypeController = require('../controllers/campaignTypeController');

// Create a new campaign type
router.post('/create', CampaignTypeController.createCampaignType);

// Get all campaign types
router.get('/all', CampaignTypeController.getAllCampaignTypes);

// Get a campaign type by ID
router.get('/get/:id', CampaignTypeController.getCampaignTypeById);

// Update a campaign type
router.put('/update/:id', CampaignTypeController.updateCampaignType);

// Delete a campaign type
router.delete('/delete/:id', CampaignTypeController.deleteCampaignType);

module.exports = router;
