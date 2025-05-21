const express = require('express');
const router = express.Router();
const personController = require('../controllers/apolloPersonController');

// Create a new person
router.post('/', personController.createPerson);

// Get all people (with optional pagination query params)
router.get('/', personController.getAllPersons);

// Get a specific person by apollo_id
router.get('/:id', personController.getPersonById);

// Update a person
router.put('/:id', personController.updatePerson);

// Delete a person
router.delete('/:id', personController.deletePerson);

// Bulk import people
// router.post('/bulk-import', personController.bulkImportPeople);

// Search people
// router.get('/search', personController.searchPeople);

module.exports = router;