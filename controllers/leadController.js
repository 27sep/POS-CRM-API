const Lead = require("../models/Lead");
const User = require("../models/User");

module.exports = {
  // Create a new lead
  createLead: async (req, res) => {
    const { first_name, last_name, email, phone, company, status, custom_fields, assigned_to, preferred_contact, source, lead_score } = req.body;

    if (assigned_to) {
      const userExists = await User.findById(assigned_to);
      if (!userExists) {
        return res.status(404).json({
          success: false,
          code: "USER_NOT_FOUND",
          message: "Assigned user not found",
        });
      }
    }

    try {
      const newLead = new Lead({
        first_name,
        last_name,
        email,
        phone,
        company,
        status,
        custom_fields,
        assigned_to,
        preferred_contact,
        source,
        lead_score,
      });

      await newLead.save();
      res.json({
        success: true,
        code: "LEAD_CREATED",
        message: "Lead created successfully",
        data: newLead,
      });
    } catch (err) {
      console.error("Error creating lead:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get all leads
  getAllLeads: async (req, res) => {
    try {
      const leads = await Lead.find();
      res.json({
        success: true,
        code: "LEADS_FETCHED",
        message: "Leads fetched successfully",
        data: leads,
      });
    } catch (err) {
      console.error("Error fetching leads:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get a lead by ID
  getLeadById: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          code: "LEAD_NOT_FOUND",
          message: "Lead not found",
        });
      }
      res.json({
        success: true,
        code: "LEAD_FETCHED",
        message: "Lead fetched successfully",
        data: lead,
      });
    } catch (err) {
      console.error("Error fetching lead:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Update a lead
  updateLead: async (req, res) => {
    const updates = req.body;

    try {
      let lead = await Lead.findById(req.params.id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          code: "LEAD_NOT_FOUND",
          message: "Lead not found",
        });
      }

      Object.keys(updates).forEach((key) => {
        lead[key] = updates[key];
      });

      await lead.save();
      res.json({
        success: true,
        code: "LEAD_UPDATED",
        message: "Lead updated successfully",
        data: lead,
      });
    } catch (err) {
      console.error("Error updating lead:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Delete a lead
  deleteLead: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          code: "LEAD_NOT_FOUND",
          message: "Lead not found",
        });
      }

      await Lead.findByIdAndDelete(req.params.id);
      res.json({
        success: true,
        code: "LEAD_DELETED",
        message: "Lead deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting lead:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },
};
