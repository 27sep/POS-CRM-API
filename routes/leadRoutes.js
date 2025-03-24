const express = require('express');
const router = express.Router();
const LeadController = require('../controllers/leadController');

// Create a new lead
router.post('/create', LeadController.createLead);

// Get all leads
router.get('/all', LeadController.getAllLeads);

// Get a lead by ID
router.get('/get/:id', LeadController.getLeadById);

// Update a lead
router.put('/update/:id', LeadController.updateLead);

// Delete a lead
router.delete('/delete/:id', LeadController.deleteLead);

module.exports = router;
