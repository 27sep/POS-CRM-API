const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const twilio = require('twilio');
const sendMail = require('../utils/mailer');

const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const authController = {
  // User login
  loginUser: async (req, res) => {
    const { email, password } = req.body;

    try {
      if (!email || !password) {
        return res.status(400).json({ success: false, code: "MISSING_FIELDS", message: "Email and password are required" });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "User not found" });
      }

      if (!user.is_active) {
        return res.status(403).json({ success: false, code: "USER_INACTIVE", message: "User account is inactive" });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, code: "INVALID_PASSWORD", message: "Invalid password" });
      }

      const accessToken = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
      const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "10y" });

      user.last_login = Date.now();
      await user.save();

      res.json({
        success: true,
        user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role, last_login: user.last_login },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Server Error" });
    }
  },

  // User registration
  registerUser: async (req, res) => {
    const { first_name, last_name, email, password, role } = req.body;

    try {
      if (!first_name || !last_name || !email || !password || !role) {
        return res.status(400).json({ success: false, code: "MISSING_FIELDS", message: "All fields are required" });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, code: "EMAIL_EXISTS", message: "Email already in use" });
      }

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      const newUser = new User({ first_name, last_name, email, password_hash, role, is_active: true });
      await newUser.save();

      res.status(201).json({ success: true, message: "User registered successfully" });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Server Error" });
    }
  },

  // Forgot password
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

      const resetToken = crypto.randomBytes(3).toString('hex'); // 6-digit code
      user.reset_token = resetToken;
      user.reset_token_expires = Date.now() + 3600000; // 1 hour
      await user.save();

      const subject = "Password Reset Code";
      const html = `
        <div>
          <h2>Hello ${user.name || "User"},</h2>
          <p>You requested a password reset. Use the code below:</p>
          <h1 style="color:#0195f7;">${resetToken}</h1>
          <p>This code will expire in 1 hour.</p>
        </div>
      `;

      await sendMail(email, subject, html);

      res.json({
        success: true,
        message: "Reset code sent to your email",
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Reset password
  resetPassword: async (req, res) => {
    const { resetToken, newPassword } = req.body;

    try {
      const user = await User.findOne({ reset_token: resetToken, reset_token_expires: { $gt: Date.now() } });
      if (!user) {
        return res.status(400).json({ success: false, code: "INVALID_TOKEN", message: "Invalid or expired token" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(newPassword, salt);
      user.reset_token = undefined;
      user.reset_token_expires = undefined;
      await user.save();

      res.json({ success: true, message: "Password reset successfully" });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Server Error" });
    }
  },
};

module.exports = authController;
