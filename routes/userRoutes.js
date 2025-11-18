// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');

// ---------------------------
// USER MANAGEMENT (CRUD)
// ---------------------------

// Get all users → Admin only
router.get('/', authMiddleware, authorizeRoles('admin'), userController.getAllUsers);

// Get user by ID → Admin only
router.get('/:id', authMiddleware, authorizeRoles('admin'), userController.getUserById);

// Create/register user → Admin only
router.post('/', authMiddleware, authorizeRoles('admin'), userController.registerUser);

// Update user → Admin only
router.put('/:id', authMiddleware, authorizeRoles('admin'), userController.updateUser);

// Delete user → Admin only
router.delete('/:id', authMiddleware, authorizeRoles('admin'), userController.deleteUser);

// ---------------------------
// ASSIGNED NUMBERS MANAGEMENT
// ---------------------------

// Assign numbers to sales manager → Admin only
router.post(
  '/assign-numbers',
  authMiddleware,
  authorizeRoles('admin'),
  userController.assignNumbers
);

// Remove numbers from sales manager → Admin only
router.post(
  '/remove-numbers',
  authMiddleware,
  authorizeRoles('admin'),
  userController.removeNumbers
);

// List assigned numbers → Authenticated users
router.get(
  '/assigned-numbers/:id',
  authMiddleware,
  userController.listAssignedNumbers
);

module.exports = router;
