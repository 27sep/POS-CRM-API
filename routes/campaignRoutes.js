const express = require('express');
const router = express.Router();
const CampaignController = require('../controllers/campaignController');

// Create a new campaign
router.post('/create', CampaignController.createCampaign);

// Get all campaigns
router.get('/all', CampaignController.getAllCampaigns);

// Get a campaign by ID
router.get('/get/:id', CampaignController.getCampaignById);

// Update a campaign
router.put('/update/:id', CampaignController.updateCampaign);

// Delete a campaign
router.delete('/delete/:id', CampaignController.deleteCampaign);

module.exports = router;
