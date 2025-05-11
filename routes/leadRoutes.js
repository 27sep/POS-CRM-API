const express = require('express');
const router = express.Router();
const LeadController = require('../controllers/leadController');
const upload = require('../config/multer');


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

router.post('/upload-csv', upload.single('csv'), LeadController.bulkImportLeads);

router.post("/read-csv", upload.single("file"), LeadController.readCSVFile);

module.exports = router;
