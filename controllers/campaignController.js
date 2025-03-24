const Campaign = require("../models/Campaign");
const User = require("../models/User");
const CampaignType = require("../models/CampaignType");

module.exports = {
  // Create a new campaign
  createCampaign: async (req, res) => {
    const { creator_id, campaign_type_id, name, description, status, type, start_date, end_date, campaign_settings, budget, target_audience } = req.body;

    const userExists = await User.findById(creator_id);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "Creator not found",
      });
    }

    const campaignTypeExists = await CampaignType.findById(campaign_type_id);
    if (!campaignTypeExists) {
      return res.status(404).json({
        success: false,
        code: "CAMPAIGN_TYPE_NOT_FOUND",
        message: "Campaign type not found",
      });
    }

    try {
      const newCampaign = new Campaign({
        creator_id,
        campaign_type_id,
        name,
        description,
        status,
        type,
        start_date,
        end_date,
        campaign_settings,
        budget,
        target_audience,
      });

      await newCampaign.save();
      res.json({
        success: true,
        code: "CAMPAIGN_CREATED",
        message: "Campaign created successfully",
        data: newCampaign,
      });
    } catch (err) {
      console.error("Error creating campaign:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get all campaigns
  getAllCampaigns: async (req, res) => {
    try {
      const campaigns = await Campaign.find();
      res.json({
        success: true,
        code: "CAMPAIGNS_FETCHED",
        message: "Campaigns fetched successfully",
        data: campaigns,
      });
    } catch (err) {
      console.error("Error fetching campaigns:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get a campaign by ID
  getCampaignById: async (req, res) => {
    try {
      const campaign = await Campaign.findById(req.params.id);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          code: "CAMPAIGN_NOT_FOUND",
          message: "Campaign not found",
        });
      }
      res.json({
        success: true,
        code: "CAMPAIGN_FETCHED",
        message: "Campaign fetched successfully",
        data: campaign,
      });
    } catch (err) {
      console.error("Error fetching campaign:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Update a campaign
  updateCampaign: async (req, res) => {
    const updates = req.body;

    try {
      let campaign = await Campaign.findById(req.params.id);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          code: "CAMPAIGN_NOT_FOUND",
          message: "Campaign not found",
        });
      }

      Object.keys(updates).forEach((key) => {
        campaign[key] = updates[key];
      });

      await campaign.save();
      res.json({
        success: true,
        code: "CAMPAIGN_UPDATED",
        message: "Campaign updated successfully",
        data: campaign,
      });
    } catch (err) {
      console.error("Error updating campaign:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Delete a campaign
  deleteCampaign: async (req, res) => {
    try {
      const campaign = await Campaign.findById(req.params.id);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          code: "CAMPAIGN_NOT_FOUND",
          message: "Campaign not found",
        });
      }

      await Campaign.findByIdAndDelete(req.params.id);
      res.json({
        success: true,
        code: "CAMPAIGN_DELETED",
        message: "Campaign deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting campaign:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },
};
