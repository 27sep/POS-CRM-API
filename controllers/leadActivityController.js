const LeadActivity = require("../models/LeadActivity");
const Lead = require("../models/Lead");
const User = require("../models/User");
const mongoose = require("mongoose");

module.exports = {
  // Create a new lead activity
  createLeadActivity: async (req, res) => {
    const { lead_id, user_id, activity_type, notes } = req.body;

    try {
      const leadExists = await Lead.findById(lead_id);
      if (!leadExists) {
        return res.status(404).json({
          success: false,
          code: "LEAD_NOT_FOUND",
          message: "Lead not found",
        });
      }

      const userExists = await User.findById(user_id);
      if (!userExists) {
        return res.status(404).json({
          success: false,
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      }

      const newActivity = new LeadActivity({
        lead_id,
        user_id,
        activity_type,
        notes,
      });

      await newActivity.save();
      res.json({
        success: true,
        code: "ACTIVITY_CREATED",
        message: "Lead activity created successfully",
        data: newActivity,
      });
    } catch (err) {
      console.error("Error creating lead activity:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get all lead activities
  getAllLeadActivities: async (req, res) => {
    try {
      const activities = await LeadActivity.find().populate('lead_id user_id');
      res.json({
        success: true,
        code: "ACTIVITIES_FETCHED",
        message: "Lead activities fetched successfully",
        data: activities,
      });
    } catch (err) {
      console.error("Error fetching lead activities:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get lead activity by ID
  getLeadActivityById: async (req, res) => {
    try {
      const activity = await LeadActivity.findById(req.params.id).populate('lead_id user_id');
      if (!activity) {
        return res.status(404).json({
          success: false,
          code: "ACTIVITY_NOT_FOUND",
          message: "Lead activity not found",
        });
      }
      res.json({
        success: true,
        code: "ACTIVITY_FETCHED",
        message: "Lead activity fetched successfully",
        data: activity,
      });
    } catch (err) {
      console.error("Error fetching lead activity:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Update a lead activity
  updateLeadActivity: async (req, res) => {
    const updates = req.body;

    try {
      let activity = await LeadActivity.findById(req.params.id);
      if (!activity) {
        return res.status(404).json({
          success: false,
          code: "ACTIVITY_NOT_FOUND",
          message: "Lead activity not found",
        });
      }

      Object.keys(updates).forEach((key) => {
        activity[key] = updates[key];
      });

      await activity.save();
      res.json({
        success: true,
        code: "ACTIVITY_UPDATED",
        message: "Lead activity updated successfully",
        data: activity,
      });
    } catch (err) {
      console.error("Error updating lead activity:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Delete a lead activity
  deleteLeadActivity: async (req, res) => {
    try {
      const activity = await LeadActivity.findById(req.params.id);
      if (!activity) {
        return res.status(404).json({
          success: false,
          code: "ACTIVITY_NOT_FOUND",
          message: "Lead activity not found",
        });
      }

      await LeadActivity.findByIdAndDelete(req.params.id);
      res.json({
        success: true,
        code: "ACTIVITY_DELETED",
        message: "Lead activity deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting lead activity:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },


  getLeadActivities:  async (req, res) => {
    try {
      // ✅ Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.params.leadId)) {
        return res.status(400).json({ success: false, error: 'Invalid Lead ID format' });
      }
  
      // ✅ Proceed if valid
      const activities = await LeadActivity.find({ lead_id: req.params.leadId })
        .populate({ path: 'user_id', model: 'User', select: 'first_name last_name email' })
        .populate({ path: 'lead_id', model: 'Lead' })
        .sort({ activity_date: -1 });
  
      res.json({ success: true, data: activities });
    } catch (error) {
      console.error(error); // More detailed error log
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
