// controllers/FollowUpController.js
const CampaignLead = require('../models/CampaignLead');
const Campaign = require('../models/Campaign');
const CampaignType = require('../models/CampaignType');
const Lead = require('../models/Lead');
const MessageHistory = require('../models/MessageHistory');
const LeadActivity = require('../models/LeadActivity');
const mongoose = require('mongoose');

module.exports = {
  //  Get all follow-ups for a user
  getUserFollowUps: async (req, res) => {
    try {
      //  Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
        return res.status(400).json({ success: false, error: 'Invalid User ID format' });
      }

      const followUps = await CampaignLead.find({
        follow_up_date: { $ne: null },
        $or: [
          { status: { $in: ['new', 'contacted'] } },
          { creator_id: req.params.userId }
        ]
      })
        .populate({
          path: 'campaign_id',
          model: 'Campaign',
          populate: { path: 'campaign_type_id', model: 'CampaignType' }
        })
        .populate({
          path: 'lead_id',
          model: 'Lead',
          select: 'first_name last_name email phone company'
        })
        // .populate({
        //     path: 'message_history',
        //     model: 'MessageHistory',
        //     options: { sort: { sent_at: -1 }, limit: 1 }
        //   })
          
        .sort({ follow_up_date: 1 });

      res.json({ success: true, data: followUps });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  createFollowUp: async (req, res) => {
    try {
      const { followUpDate, notes, leadId } = req.body;

      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.params.campaignLeadId)) {
        return res.status(400).json({ success: false, error: 'Invalid Campaign Lead ID format' });
      }

      // Validate user
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      }

      // Update CampaignLead
      await CampaignLead.findByIdAndUpdate(req.params.campaignLeadId, {
        follow_up_date: followUpDate,
        status: 'contacted'
      });

      // Create Lead Activity
      const followUpData = await LeadActivity.create({
        lead_id: leadId,
        user_id: req.user.userId,   // This will not fail now
        activity_type: 'follow_up',
        notes: notes || 'Follow-up scheduled',
        activity_date: new Date()
      });

      res.json({ success: true, message: 'Follow-up created successfully',data:followUpData });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  //  Complete a follow-up
  completeFollowUp: async (req, res) => {
    try {
      const { outcome, notes } = req.body;

      //  Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.params.followUpId)) {
        return res.status(400).json({ success: false, error: 'Invalid Follow-up ID format' });
      }

      const followUp = await CampaignLead.findById(req.params.followUpId);

      if (!followUp) {
        return res.status(404).json({ success: false, error: 'Follow-up not found' });
      }

      //  Update Follow-up
      followUp.follow_up_date = null;
      followUp.status = outcome === 'converted' ? 'converted' : 'contacted';
      followUp.last_contacted = new Date();
      await followUp.save();

      //  Create Lead Activity
      await LeadActivity.create({
        lead_id: followUp.lead_id,
        user_id: req.user.id,
        activity_type: 'follow_up',
        notes: notes || `Follow-up completed: ${outcome}`,
        activity_date: new Date()
      });

      res.json({ success: true, message: 'Follow-up completed successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
