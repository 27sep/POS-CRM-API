const CampaignType = require("../models/CampaignType");

module.exports = {
  // Create a new campaign type
  createCampaignType: async (req, res) => {
    const { name, description, is_active } = req.body;

    try {
      const newCampaignType = new CampaignType({
        name,
        description,
        is_active,
      });

      await newCampaignType.save();
      res.json({
        success: true,
        code: "CAMPAIGN_TYPE_CREATED",
        message: "Campaign type created successfully",
        data: newCampaignType,
      });
    } catch (err) {
      console.error("Error creating campaign type:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get all campaign types
  getAllCampaignTypes: async (req, res) => {
    try {
      const campaignTypes = await CampaignType.find();
      res.json({
        success: true,
        code: "CAMPAIGN_TYPES_FETCHED",
        message: "Campaign types fetched successfully",
        data: campaignTypes,
      });
    } catch (err) {
      console.error("Error fetching campaign types:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get a campaign type by ID
  getCampaignTypeById: async (req, res) => {
    try {
      const campaignType = await CampaignType.findById(req.params.id);
      if (!campaignType) {
        return res.status(404).json({
          success: false,
          code: "CAMPAIGN_TYPE_NOT_FOUND",
          message: "Campaign type not found",
        });
      }
      res.json({
        success: true,
        code: "CAMPAIGN_TYPE_FETCHED",
        message: "Campaign type fetched successfully",
        data: campaignType,
      });
    } catch (err) {
      console.error("Error fetching campaign type:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Update a campaign type
  updateCampaignType: async (req, res) => {
    const updates = req.body;

    try {
      let campaignType = await CampaignType.findById(req.params.id);
      if (!campaignType) {
        return res.status(404).json({
          success: false,
          code: "CAMPAIGN_TYPE_NOT_FOUND",
          message: "Campaign type not found",
        });
      }

      Object.keys(updates).forEach((key) => {
        campaignType[key] = updates[key];
      });

      await campaignType.save();
      res.json({
        success: true,
        code: "CAMPAIGN_TYPE_UPDATED",
        message: "Campaign type updated successfully",
        data: campaignType,
      });
    } catch (err) {
      console.error("Error updating campaign type:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Delete a campaign type
  deleteCampaignType: async (req, res) => {
    try {
      const campaignType = await CampaignType.findById(req.params.id);
      if (!campaignType) {
        return res.status(404).json({
          success: false,
          code: "CAMPAIGN_TYPE_NOT_FOUND",
          message: "Campaign type not found",
        });
      }

      await CampaignType.findByIdAndDelete(req.params.id);
      res.json({
        success: true,
        code: "CAMPAIGN_TYPE_DELETED",
        message: "Campaign type deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting campaign type:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },
};
