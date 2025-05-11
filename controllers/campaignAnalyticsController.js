const CampaignAnalytics = require('../models/CampaignAnalytics');
const Campaign = require('../models/Campaign');
const CampaignType = require('../models/CampaignType');
const User = require('../models/User');

module.exports = {
  // Create a new campaign analytics record
  createCampaignAnalytics: async (req, res) => {
    const { campaign_id, total_leads, converted_leads, total_messages_sent, yes_responses, no_responses, later_responses, metrics } = req.body;

    try {
      const campaignExists = await Campaign.findById(campaign_id);
      if (!campaignExists) {
        return res.status(404).json({
          success: false,
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign not found',
        });
      }

      const conversion_rate = total_leads > 0 ? ((converted_leads / total_leads) * 100).toFixed(2) : 0;

      const newAnalytics = new CampaignAnalytics({
        campaign_id,
        total_leads,
        converted_leads,
        conversion_rate,
        total_messages_sent,
        yes_responses,
        no_responses,
        later_responses,
        metrics,
      });

      await newAnalytics.save();
      res.json({
        success: true,
        code: 'CAMPAIGN_ANALYTICS_CREATED',
        message: 'Campaign analytics created successfully',
        data: newAnalytics,
      });
    } catch (err) {
      console.error('Error creating campaign analytics:', err.message);
      res.status(500).json({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Server Error',
      });
    }
  },

  // Get all campaign analytics
  getAllCampaignAnalytics: async (req, res) => {
    try {
      const analytics = await CampaignAnalytics.find().populate('campaign_id');
      res.json({
        success: true,
        code: 'CAMPAIGN_ANALYTICS_FETCHED',
        message: 'Campaign analytics fetched successfully',
        data: analytics,
      });
    } catch (err) {
      console.error('Error fetching campaign analytics:', err.message);
      res.status(500).json({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Server Error',
      });
    }
  },

  // Get analytics by campaign ID
  getCampaignAnalyticsById: async (req, res) => {
    try {
      const analytics = await CampaignAnalytics.findById(req.params.id).populate('campaign_id');
      if (!analytics) {
        return res.status(404).json({
          success: false,
          code: 'CAMPAIGN_ANALYTICS_NOT_FOUND',
          message: 'Campaign analytics not found',
        });
      }
      res.json({
        success: true,
        code: 'CAMPAIGN_ANALYTICS_FETCHED',
        message: 'Campaign analytics fetched successfully',
        data: analytics,
      });
    } catch (err) {
      console.error('Error fetching campaign analytics:', err.message);
      res.status(500).json({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Server Error',
      });
    }
  },

  // Update campaign analytics
  updateCampaignAnalytics: async (req, res) => {
    const updates = req.body;

    try {
      let analytics = await CampaignAnalytics.findById(req.params.id);
      if (!analytics) {
        return res.status(404).json({
          success: false,
          code: 'CAMPAIGN_ANALYTICS_NOT_FOUND',
          message: 'Campaign analytics not found',
        });
      }

      Object.keys(updates).forEach((key) => {
        analytics[key] = updates[key];
      });

      if (updates.total_leads !== undefined && updates.converted_leads !== undefined) {
        analytics.conversion_rate = ((updates.converted_leads / updates.total_leads) * 100).toFixed(2);
      }

      await analytics.save();
      res.json({
        success: true,
        code: 'CAMPAIGN_ANALYTICS_UPDATED',
        message: 'Campaign analytics updated successfully',
        data: analytics,
      });
    } catch (err) {
      console.error('Error updating campaign analytics:', err.message);
      res.status(500).json({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Server Error',
      });
    }
  },

  // Delete campaign analytics
  deleteCampaignAnalytics: async (req, res) => {
    try {
      const analytics = await CampaignAnalytics.findOne({ campaign_id: req.params.id });
      if (!analytics) {
        return res.status(404).json({
          success: false,
          code: 'CAMPAIGN_ANALYTICS_NOT_FOUND',
          message: 'Campaign analytics not found',
        });
      }

      await CampaignAnalytics.findByIdAndDelete(analytics._id);
      res.json({
        success: true,
        code: 'CAMPAIGN_ANALYTICS_DELETED',
        message: 'Campaign analytics deleted successfully',
      });
    } catch (err) {
      console.error('Error deleting campaign analytics:', err.message);
      res.status(500).json({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Server Error',
      });
    }
  },

  getUserCampaignActivities: async (req, res) => {
    try {
      const activities = await CampaignAnalytics.find()
      .populate({
        path: 'campaign_id',
        match: { creator_id: req.params.userId }, // Corrected filtering
        populate: [
          { path: 'campaign_type_id', model: 'CampaignType' },
          { path: 'creator_id', model: 'User' } // Populating the creator correctly
        ]
      })
      .sort({ record_date: -1 })
      .limit(20);

    // Filter out null campaigns if the match doesn't find anything
    const filteredActivities = activities.filter(activity => activity.campaign_id !== null);


      res.json({ success: true, data: filteredActivities });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

};
