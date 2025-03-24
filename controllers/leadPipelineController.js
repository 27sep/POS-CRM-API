const LeadPipeline = require("../models/LeadPipeline");
const Campaign = require("../models/Campaign");

module.exports = {
  // Create a new lead pipeline stage
  createLeadPipeline: async (req, res) => {
    const { campaign_id, stage_name, stage_order } = req.body;

    try {
      const campaignExists = await Campaign.findById(campaign_id);
      if (!campaignExists) {
        return res.status(404).json({
          success: false,
          code: "CAMPAIGN_NOT_FOUND",
          message: "Campaign not found",
        });
      }

      const newPipelineStage = new LeadPipeline({
        campaign_id,
        stage_name,
        stage_order,
      });

      await newPipelineStage.save();
      res.json({
        success: true,
        code: "PIPELINE_CREATED",
        message: "Lead pipeline stage created successfully",
        data: newPipelineStage,
      });
    } catch (err) {
      console.error("Error creating lead pipeline stage:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get all lead pipeline stages
  getAllLeadPipelines: async (req, res) => {
    try {
      const pipelines = await LeadPipeline.find().populate("campaign_id");
      res.json({
        success: true,
        code: "PIPELINES_FETCHED",
        message: "Lead pipelines fetched successfully",
        data: pipelines,
      });
    } catch (err) {
      console.error("Error fetching lead pipelines:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get lead pipeline stage by ID
  getLeadPipelineById: async (req, res) => {
    try {
      const pipeline = await LeadPipeline.findById(req.params.id).populate("campaign_id");
      if (!pipeline) {
        return res.status(404).json({
          success: false,
          code: "PIPELINE_NOT_FOUND",
          message: "Lead pipeline stage not found",
        });
      }
      res.json({
        success: true,
        code: "PIPELINE_FETCHED",
        message: "Lead pipeline stage fetched successfully",
        data: pipeline,
      });
    } catch (err) {
      console.error("Error fetching lead pipeline stage:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Update a lead pipeline stage
  updateLeadPipeline: async (req, res) => {
    const updates = req.body;

    try {
      let pipeline = await LeadPipeline.findById(req.params.id);
      if (!pipeline) {
        return res.status(404).json({
          success: false,
          code: "PIPELINE_NOT_FOUND",
          message: "Lead pipeline stage not found",
        });
      }

      Object.keys(updates).forEach((key) => {
        pipeline[key] = updates[key];
      });

      await pipeline.save();
      res.json({
        success: true,
        code: "PIPELINE_UPDATED",
        message: "Lead pipeline stage updated successfully",
        data: pipeline,
      });
    } catch (err) {
      console.error("Error updating lead pipeline stage:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Delete a lead pipeline stage
  deleteLeadPipeline: async (req, res) => {
    try {
      const pipeline = await LeadPipeline.findById(req.params.id);
      if (!pipeline) {
        return res.status(404).json({
          success: false,
          code: "PIPELINE_NOT_FOUND",
          message: "Lead pipeline stage not found",
        });
      }

      await LeadPipeline.findByIdAndDelete(req.params.id);
      res.json({
        success: true,
        code: "PIPELINE_DELETED",
        message: "Lead pipeline stage deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting lead pipeline stage:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },
};
