const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');

// USER MANAGEMENT
router.get('/', authMiddleware, authorizeRoles('admin'), userController.getAllUsers);
router.get('/:id', authMiddleware, authorizeRoles('admin'), userController.getUserById);
router.post('/', authMiddleware, authorizeRoles('admin'), userController.registerUser);
router.put('/:id', authMiddleware, authorizeRoles('admin'), userController.updateUser);
router.delete('/:id', authMiddleware, authorizeRoles('admin'), userController.deleteUser);

// ASSIGNED NUMBERS
router.post('/assign-numbers', authMiddleware, authorizeRoles('admin'), userController.assignNumbers);
router.post('/remove-numbers', authMiddleware, authorizeRoles('admin'), userController.removeNumbers);
router.get('/assigned-numbers/:id', authMiddleware, userController.listAssignedNumbers);

module.exports = router;
