const MessageTemplate = require('../models/MessageTemplate');
const Campaign = require('../models/Campaign');

module.exports = {
  // Create a new message template
  createMessageTemplate: async (req, res) => {
    const { campaign_id, name, content, type, variables, is_active } = req.body;

    try {
      const campaignExists = await Campaign.findById(campaign_id);
      if (!campaignExists) {
        return res.status(404).json({
          success: false,
          code: "CAMPAIGN_NOT_FOUND",
          message: "Campaign not found",
        });
      }

      const newTemplate = new MessageTemplate({
        campaign_id,
        name,
        content,
        type,
        variables,
        is_active
      });

      await newTemplate.save();
      res.json({
        success: true,
        code: "TEMPLATE_CREATED",
        message: "Message template created successfully",
        data: newTemplate
      });
    } catch (err) {
      console.error("Error creating message template:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get all message templates
  getAllMessageTemplates: async (req, res) => {
    try {
      const templates = await MessageTemplate.find().populate('campaign_id');
      res.json({
        success: true,
        code: "TEMPLATES_FETCHED",
        message: "Message templates fetched successfully",
        data: templates
      });
    } catch (err) {
      console.error("Error fetching message templates:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get message template by ID
  getMessageTemplateById: async (req, res) => {
    try {
      const template = await MessageTemplate.findById(req.params.id).populate('campaign_id');
      if (!template) {
        return res.status(404).json({
          success: false,
          code: "TEMPLATE_NOT_FOUND",
          message: "Message template not found",
        });
      }
      res.json({
        success: true,
        code: "TEMPLATE_FETCHED",
        message: "Message template fetched successfully",
        data: template
      });
    } catch (err) {
      console.error("Error fetching message template:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Update a message template
  updateMessageTemplate: async (req, res) => {
    const updates = req.body;

    try {
      let template = await MessageTemplate.findById(req.params.id);
      if (!template) {
        return res.status(404).json({
          success: false,
          code: "TEMPLATE_NOT_FOUND",
          message: "Message template not found",
        });
      }

      Object.keys(updates).forEach((key) => {
        template[key] = updates[key];
      });

      await template.save();
      res.json({
        success: true,
        code: "TEMPLATE_UPDATED",
        message: "Message template updated successfully",
        data: template
      });
    } catch (err) {
      console.error("Error updating message template:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Delete a message template
  deleteMessageTemplate: async (req, res) => {
    try {
      const template = await MessageTemplate.findById(req.params.id);
      if (!template) {
        return res.status(404).json({
          success: false,
          code: "TEMPLATE_NOT_FOUND",
          message: "Message template not found",
        });
      }

      await MessageTemplate.findByIdAndDelete(req.params.id);
      res.json({
        success: true,
        code: "TEMPLATE_DELETED",
        message: "Message template deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting message template:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  }
};
