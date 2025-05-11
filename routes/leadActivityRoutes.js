// routes/leadActivityRoutes.js
const express = require('express');
const router = express.Router();
const leadActivityController = require('../controllers/leadActivityController');

// Create a new lead activity
router.post('/create', leadActivityController.createLeadActivity);

// Get all lead activities
router.get('/all', leadActivityController.getAllLeadActivities);

// Get lead activities by lead ID
router.get('/get/:id', leadActivityController.getLeadActivityById);

// Update a lead activity
router.put('/update/:id', leadActivityController.updateLeadActivity);

// Delete a lead activity
router.delete('/delete/:id', leadActivityController.deleteLeadActivity);
// Get lead activities by lead ID
router.get('/:leadId/activities', leadActivityController.getLeadActivities);

module.exports = router;
