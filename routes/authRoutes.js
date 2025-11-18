// routes/authRoutes.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authMiddleware, authorizeRoles } = require('../middlewares/authMiddleware');

// ---------------------------
// PUBLIC ROUTES
// ---------------------------

router.post('/login', authController.loginUser);
router.post('/register', authController.registerUser);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// ---------------------------
// PROTECTED ROUTES
// ---------------------------

// =========================
// ADMIN → VIEW ALL CALL LOGS
// =========================
router.get(
  '/calls/admin',
  authMiddleware,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      return res.json({
        success: true,
        message: "ADMIN: Can view ALL call logs"
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// =========================
// SALES MANAGER → VIEW ONLY ASSIGNED NUMBERS CALL LOGS
// =========================
router.get(
  '/calls/sales-manager',
  authMiddleware,
  authorizeRoles('sales_manager', 'admin'),  // admin can also access
  async (req, res) => {
    try {
      return res.json({
        success: true,
        message: "SALES MANAGER: Can view ONLY assigned numbers",
        assigned_numbers: req.user.assigned_numbers
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
