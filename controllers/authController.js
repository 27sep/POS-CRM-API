// controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendMail } = require("../utils/mailer");

// =========================
// ROLE-BASED PERMISSIONS
// =========================
const rolePermissions = {
  admin: {
    canViewAllCalls: true,
    canViewAllSMS: true,
    canDeleteCalls: true,
    canEditUsers: true,
    canViewDashboard: true,
  },
  sales_manager: {
    canViewAssignedCalls: true,
    canViewAssignedSMS: true,
    canDeleteCalls: false,
    canEditUsers: false,
    canViewDashboard: true,
  },
};

// Return permissions for role
const getPermissions = (role) => rolePermissions[role] || {};

const authController = {
  // ================================
  // LOGIN USER  (FIXED VERSION)
  // ================================
  loginUser: async (req, res) => {
    const { email, password } = req.body;

    try {
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          code: "MISSING_FIELDS",
          message: "Email and password are required",
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_INACTIVE",
          message: "User account is inactive",
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(400).json({
          success: false,
          code: "INVALID_PASSWORD",
          message: "Invalid password",
        });
      }

      // Assigned numbers from DB
      const assignedNumbers = user.assigned_numbers || [];

      // ⭐ ADDED: user.phone into JWT token
      // ⭐ ADDED: assigned_numbers also injected properly
      const accessToken = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          phone: user.phone || null, // <-- IMPORTANT FIX
          assigned_numbers: assignedNumbers,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "10y" }
      );

      // Update last login time
      user.last_login = new Date();
      await user.save();

      const permissions = getPermissions(user.role);

      return res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
          phone: user.phone || null, // <-- RETURN TO FRONTEND
          assigned_numbers: assignedNumbers,
          last_login: user.last_login,
          permissions,
        },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error("Login Error:", err);
      return res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Internal server error",
      });
    }
  },

  // ================================
  // REGISTER USER
  // ================================
  registerUser: async (req, res) => {
    const { first_name, last_name, email, password, role, assigned_numbers } =
      req.body;

    try {
      if (!first_name || !last_name || !email || !password || !role) {
        return res.status(400).json({
          success: false,
          code: "MISSING_FIELDS",
          message: "All fields are required",
        });
      }

      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(400).json({
          success: false,
          code: "EMAIL_EXISTS",
          message: "Email already in use",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      const newUser = new User({
        first_name,
        last_name,
        email,
        password_hash,
        role,
        assigned_numbers: assigned_numbers || [], // for sales_manager
        is_active: true,
      });

      await newUser.save();

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    } catch (err) {
      console.error("Registration Error:", err);
      return res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Internal server error",
      });
    }
  },

  // ================================
  // FORGOT PASSWORD
  // ================================
  forgotPassword: async (req, res) => {
    const { email } = req.body;

    try {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      }

      const resetToken = crypto.randomBytes(3).toString("hex");

      user.reset_token = resetToken;
      user.reset_token_expires = Date.now() + 3600000; // 1 hr
      await user.save();

      // Email content
      const subject = "Password Reset Code";
      const html = `
        <div>
          <h2>Hello ${user.first_name},</h2>
          <p>Your password reset code:</p>
          <h1 style="color:#0195f7;">${resetToken}</h1>
          <p>This code expires in 1 hour.</p>
        </div>
      `;

      await sendMail(email, subject, html);

      return res.json({
        success: true,
        message: "Reset code sent to email",
      });
    } catch (err) {
      console.error("Forgot Password Error:", err);
      return res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Internal server error",
      });
    }
  },

  // ================================
  // RESET PASSWORD
  // ================================
  resetPassword: async (req, res) => {
    const { resetToken, newPassword } = req.body;

    try {
      const user = await User.findOne({
        reset_token: resetToken,
        reset_token_expires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          code: "INVALID_TOKEN",
          message: "Invalid or expired reset token",
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(newPassword, salt);
      user.reset_token = undefined;
      user.reset_token_expires = undefined;

      await user.save();

      return res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (err) {
      console.error("Password Reset Error:", err);
      return res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Internal server error",
      });
    }
  },
};

module.exports = authController;
