const bcrypt = require("bcryptjs");
const User = require("../models/user");

module.exports = {
  // Register a new user
  registerUser: async (req, res) => {
    const { firstName, lastName, email, password, role } = req.body;

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, code: "USER_EXISTS", message: "User with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: role || "user",
      });

      await newUser.save();

      res.json({ success: true, code: "USER_CREATED", message: "User registered successfully" });
    } catch (err) {
      console.error("Error registering user:", err.message);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Server Error", error: err });
    }
  },

  // Get all users
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find();
      res.json({ success: true, code: "USERS_FETCHED", message: "Users fetched successfully", data: users });
    } catch (err) {
      console.error("Error fetching users:", err.message);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Server Error" });
    }
  },

  // Get a user by ID
  getUserById: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "User not found" });
      res.json({ success: true, code: "USER_FETCHED", message: "User fetched successfully", data: user });
    } catch (err) {
      console.error("Error fetching user:", err.message);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Server Error" });
    }
  },

  // Update a user
  updateUser: async (req, res) => {
    const updates = req.body;
    try {
      let user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "User not found" });

      if (updates.email && updates.email !== user.email) {
        const existingUser = await User.findOne({ email: updates.email });
        if (existingUser) return res.status(400).json({ success: false, code: "EMAIL_EXISTS", message: "Email already in use" });
      }

      Object.keys(updates).forEach((key) => (user[key] = updates[key]));
      await user.save();

      res.json({ success: true, code: "USER_UPDATED", message: "User updated successfully", data: user });
    } catch (err) {
      console.error("Error updating user:", err.message);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Server Error" });
    }
  },

  // Delete a user
  deleteUser: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "User not found" });

      await User.findByIdAndDelete(req.params.id);
      res.json({ success: true, code: "USER_DELETED", message: "User deleted successfully" });
    } catch (err) {
      console.error("Error deleting user:", err.message);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Server Error" });
    }
  },
};
