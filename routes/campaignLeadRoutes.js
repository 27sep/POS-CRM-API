const express = require('express');
const router = express.Router();
const CampaignLeadController = require('../controllers/campaignLeadController');

// Create a new campaign lead
router.post('/create', CampaignLeadController.createCampaignLead);

// Get all campaign leads
router.get('/all', CampaignLeadController.getAllCampaignLeads);

// Get a campaign lead by ID
router.get('/get/:id', CampaignLeadController.getCampaignLeadById);

// Update a campaign lead
router.put('/update/:id', CampaignLeadController.updateCampaignLead);

// Delete a campaign lead
router.delete('/delete/:id', CampaignLeadController.deleteCampaignLead);

module.exports = router;