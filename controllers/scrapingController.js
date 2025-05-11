const { scrapeWebsiteContacts, scrapeLinkedIn, scrapeTwitter } = require('../services/scrapingService');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const CampaignLead = require('../models/CampaignLead');

module.exports = {
  // Scrape contacts from various sources
  scrapeContacts: async (req, res) => {
    try {
      const { url, source } = req.body;
      let contacts = [];

      switch (source) {
        case 'website':
          contacts = await scrapeWebsiteContacts(url);
          break;
        case 'linkedin':
          contacts = await scrapeLinkedIn(url);
          break;
        case 'twitter':
          contacts = await scrapeTwitter(url);
          break;
        default:
          return res.status(400).json({ success: false, error: 'Invalid source type' });
      }

      res.json({ success: true, contacts });
    } catch (error) {
      console.error('Scraping error:', error);
      res.status(500).json({ success: false, error: 'Failed to scrape contacts' });
    }
  },

  // Save scraped contacts to a campaign
  saveScrapedContacts: async (req, res) => {
    try {
      const { contacts, campaignId } = req.body;

      // Validate campaign exists
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({ success: false, error: 'Campaign not found' });
      }

      // Process and save contacts
      const savedContacts = await Promise.all(
        contacts.map(async (contact) => {
          // Check if lead already exists
          let lead = await Lead.findOne({ email: contact.email });

          if (!lead) {
            // Create new lead
            lead = await Lead.create({
              first_name: contact.name.split(' ')[0],
              last_name: contact.name.split(' ').slice(1).join(' '),
              email: contact.email,
              phone: contact.phone,
              company: contact.company,
              status: 'new',
              custom_fields: {
                position: contact.position,
                source: contact.source
              }
            });
          }

          // Add to campaign
          const campaignLead = await CampaignLead.create({
            campaign_id: campaignId,
            lead_id: lead._id,
            status: 'new',
            added_at: new Date()
          });

          return {
            lead_id: lead._id,
            campaign_lead_id: campaignLead._id
          };
        })
      );

      res.json({ 
        success: true, 
        message: `Added ${savedContacts.length} contacts to campaign`,
        data: savedContacts
      });
    } catch (error) {
      console.error('Save contacts error:', error);
      res.status(500).json({ success: false, error: 'Failed to save contacts' });
    }
  }
};
