const CampaignLead = require('../models/CampaignLead');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');

module.exports = {
  // Create a new campaign lead
  createCampaignLead: async (req, res) => {
    const { campaign_id, lead_id, status, response, follow_up_date } = req.body;

    try {
      // Check if campaign and lead IDs are valid
      const campaign = await Campaign.findById(campaign_id);
      const lead = await Lead.findById(lead_id);

      if (!campaign) {
        return res.status(404).json({
          success: false,
          code: "CAMPAIGN_NOT_FOUND",
          message: "Campaign not found",
        });
      }
      if (!lead) {
        return res.status(404).json({
          success: false,
          code: "LEAD_NOT_FOUND",
          message: "Lead not found",
        });
      }

      const newCampaignLead = new CampaignLead({
        campaign_id,
        lead_id,
        status,
        response,
        follow_up_date,
      });

      await newCampaignLead.save();
      res.json({
        success: true,
        code: "CAMPAIGN_LEAD_CREATED",
        message: "Campaign lead created successfully",
        data: newCampaignLead,
      });
    } catch (err) {
      console.error("Error creating campaign lead:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get all campaign leads
  getAllCampaignLeads: async (req, res) => {
    try {
      const leads = await CampaignLead.find().populate('campaign_id lead_id');
      res.json({
        success: true,
        code: "LEADS_FETCHED",
        message: "Campaign leads fetched successfully",
        data: leads,
      });
    } catch (err) {
      console.error("Error fetching campaign leads:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get a campaign lead by ID
  getCampaignLeadById: async (req, res) => {
    try {
      const lead = await CampaignLead.findById(req.params.id).populate('campaign_id lead_id');
      if (!lead) {
        return res.status(404).json({
          success: false,
          code: "LEAD_NOT_FOUND",
          message: "Campaign lead not found",
        });
      }
      res.json({
        success: true,
        code: "LEAD_FETCHED",
        message: "Campaign lead fetched successfully",
        data: lead,
      });
    } catch (err) {
      console.error("Error fetching campaign lead:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Update a campaign lead
  updateCampaignLead: async (req, res) => {
    const updates = req.body;

    try {
      let lead = await CampaignLead.findById(req.params.id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          code: "LEAD_NOT_FOUND",
          message: "Campaign lead not found",
        });
      }

      Object.keys(updates).forEach((key) => {
        lead[key] = updates[key];
      });

      await lead.save();
      res.json({
        success: true,
        code: "LEAD_UPDATED",
        message: "Campaign lead updated successfully",
        data: lead,
      });
    } catch (err) {
      console.error("Error updating campaign lead:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Delete a campaign lead
  deleteCampaignLead: async (req, res) => {
    try {
      const lead = await CampaignLead.findById(req.params.id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          code: "LEAD_NOT_FOUND",
          message: "Campaign lead not found",
        });
      }

      await CampaignLead.findByIdAndDelete(req.params.id);
      res.json({
        success: true,
        code: "LEAD_DELETED",
        message: "Campaign lead deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting campaign lead:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },
};
