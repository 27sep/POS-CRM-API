// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');

// Apply auth middleware to ALL user routes
router.use(authMiddleware);

// ---------------------------
// USER MANAGEMENT (CRUD) - Admin only
// ---------------------------
router.get('/', authorizeRoles('admin'), userController.getAllUsers);
router.get('/:id', authorizeRoles('admin'), userController.getUserById);
router.post('/', authorizeRoles('admin'), userController.registerUser);
router.put('/:id', authorizeRoles('admin'), userController.updateUser);
router.delete('/:id', authorizeRoles('admin'), userController.deleteUser);

// ---------------------------
// ASSIGNED NUMBERS MANAGEMENT - Admin only
// ---------------------------
router.post('/assign-numbers', authorizeRoles('admin'), userController.assignNumbers);
router.post('/remove-numbers', authorizeRoles('admin'), userController.removeNumbers);

// ---------------------------
// LIST ASSIGNED NUMBERS - Authenticated users (sales_manager or admin)
// ---------------------------
router.get('/assigned-numbers/:id', userController.listAssignedNumbers);

module.exports = router;