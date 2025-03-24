const MessageHistory = require("../models/MessageHistory");
const CampaignLead = require("../models/CampaignLead");
const MessageTemplate = require("../models/MessageTemplate");
const User = require("../models/User");

module.exports = {
  // Create a new message history entry
  createMessageHistory: async (req, res) => {
    const { campaign_lead_id, template_id, sender_id, type, content, status, response } = req.body;

    try {
      // Validate related entities
      const leadExists = await CampaignLead.findById(campaign_lead_id);
      if (!leadExists) {
        return res.status(404).json({ success: false, code: "LEAD_NOT_FOUND", message: "Campaign lead not found" });
      }

      if (template_id) {
        const templateExists = await MessageTemplate.findById(template_id);
        if (!templateExists) {
          return res.status(404).json({ success: false, code: "TEMPLATE_NOT_FOUND", message: "Message template not found" });
        }
      }

      const userExists = await User.findById(sender_id);
      if (!userExists) {
        return res.status(404).json({ success: false, code: "USER_NOT_FOUND", message: "Sender not found" });
      }

      // Create message history entry
      const newMessageHistory = new MessageHistory({
        campaign_lead_id,
        template_id,
        sender_id,
        type,
        content,
        status,
        response,
        sent_at: new Date(),
      });

      await newMessageHistory.save();
      res.json({
        success: true,
        code: "MESSAGE_HISTORY_CREATED",
        message: "Message history entry created successfully",
        data: newMessageHistory,
      });
    } catch (err) {
      console.error("Error creating message history:", err.message);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Server Error" });
    }
  },

  // Get all message history entries
  getAllMessageHistories: async (req, res) => {
    try {
      const histories = await MessageHistory.find().populate("campaign_lead_id template_id sender_id");
      res.json({
        success: true,
        code: "MESSAGE_HISTORIES_FETCHED",
        message: "Message histories fetched successfully",
        data: histories,
      });
    } catch (err) {
      console.error("Error fetching message histories:", err.message);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Server Error" });
    }
  },

  // Get message history by ID
  getMessageHistoryById: async (req, res) => {
    try {
      const history = await MessageHistory.findById(req.params.id).populate("campaign_lead_id template_id sender_id");
      if (!history) {
        return res.status(404).json({ success: false, code: "MESSAGE_HISTORY_NOT_FOUND", message: "Message history not found" });
      }
      res.json({ success: true, code: "MESSAGE_HISTORY_FETCHED", message: "Message history fetched successfully", data: history });
    } catch (err) {
      console.error("Error fetching message history:", err.message);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Server Error" });
    }
  },

  // Update message history
  updateMessageHistory: async (req, res) => {
    const updates = req.body;

    try {
      let history = await MessageHistory.findById(req.params.id);
      if (!history) {
        return res.status(404).json({ success: false, code: "MESSAGE_HISTORY_NOT_FOUND", message: "Message history not found" });
      }

      Object.keys(updates).forEach((key) => {
        history[key] = updates[key];
      });

      history.response_at = new Date();
      await history.save();
      res.json({ success: true, code: "MESSAGE_HISTORY_UPDATED", message: "Message history updated successfully", data: history });
    } catch (err) {
      console.error("Error updating message history:", err.message);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Server Error" });
    }
  },

  // Delete message history
  deleteMessageHistory: async (req, res) => {
    try {
      const history = await MessageHistory.findById(req.params.id);
      if (!history) {
        return res.status(404).json({ success: false, code: "MESSAGE_HISTORY_NOT_FOUND", message: "Message history not found" });
      }

      await MessageHistory.findByIdAndDelete(req.params.id);
      res.json({ success: true, code: "MESSAGE_HISTORY_DELETED", message: "Message history deleted successfully" });
    } catch (err) {
      console.error("Error deleting message history:", err.message);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Server Error" });
    }
  },
};
