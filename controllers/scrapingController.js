const { scrapeWebsiteContacts, scrapeLinkedIn, scrapeTwitter } = require('../services/scrapingService');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const CampaignLead = require('../models/CampaignLead');

module.exports = {
  // Scrape contacts from various sources
  scrapeContacts: async (req, res) => {
    try {
      const { url, source } = req.body;
      
      if (!url || !source) {
        return res.status(400).json({ 
          success: false, 
          error: 'URL and source are required' 
        });
      }

      console.log(`Starting scrape for ${source}: ${url}`);
      
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
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid source type. Must be website, linkedin, or twitter' 
          });
      }

      // Add source metadata to each contact
      contacts = contacts.map(contact => ({
        ...contact,
        source_type: source,
        source_url: url,
        scraped_at: new Date().toISOString()
      }));

      console.log(`Scrape complete. Found ${contacts.length} contacts`);

      res.json({ 
        success: true, 
        count: contacts.length,
        message: contacts.length > 0 ? `Found ${contacts.length} contacts` : 'No contacts found on this page',
        contacts 
      });
      
    } catch (error) {
      console.error('Scraping error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to scrape contacts: ' + error.message 
      });
    }
  },

  // Save scraped contacts to a campaign
  saveScrapedContacts: async (req, res) => {
    try {
      const { contacts, campaignId } = req.body;

      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Contacts array is required and cannot be empty' 
        });
      }

      if (!campaignId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Campaign ID is required' 
        });
      }

      // Validate campaign exists
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({ 
          success: false, 
          error: 'Campaign not found' 
        });
      }

      const savedContacts = [];
      const errors = [];

      // Process and save contacts
      for (const contact of contacts) {
        try {
          // Skip if no useful information
          if (!contact.email && !contact.phone && contact.name === 'Unknown') {
            errors.push({ contact, error: 'No useful contact information' });
            continue;
          }

          // Parse name properly
          let firstName = 'Unknown';
          let lastName = '';

          if (contact.name && contact.name !== 'Unknown' && contact.name !== 'N/A') {
            const nameParts = contact.name.split(' ');
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ') || '';
          }

          // Check if lead already exists (by email or phone if available)
          let lead = null;
          
          if (contact.email) {
            lead = await Lead.findOne({ email: contact.email });
          } else if (contact.phone) {
            lead = await Lead.findOne({ phone: contact.phone });
          }

          if (!lead) {
            // Create new lead
            lead = await Lead.create({
              first_name: firstName,
              last_name: lastName,
              email: contact.email || null,
              phone: contact.phone || null,
              company: contact.company || null,
              status: 'new',
              custom_fields: {
                position: contact.position || null,
                source_url: contact.source || contact.source_url,
                source_type: contact.source_type || 'website',
                scraped_at: contact.scraped_at || new Date().toISOString()
              }
            });
          } else {
            // Update existing lead with new info if available
            let updated = false;
            
            if (contact.phone && !lead.phone) {
              lead.phone = contact.phone;
              updated = true;
            }
            
            if (contact.company && !lead.company) {
              lead.company = contact.company;
              updated = true;
            }
            
            if (contact.position && !lead.custom_fields?.position) {
              lead.custom_fields = {
                ...lead.custom_fields,
                position: contact.position
              };
              updated = true;
            }
            
            if (updated) {
              await lead.save();
            }
          }

          // Check if already in campaign
          const existingCampaignLead = await CampaignLead.findOne({
            campaign_id: campaignId,
            lead_id: lead._id
          });

          if (!existingCampaignLead) {
            // Add to campaign
            const campaignLead = await CampaignLead.create({
              campaign_id: campaignId,
              lead_id: lead._id,
              status: 'new',
              added_at: new Date()
            });

            savedContacts.push({
              lead_id: lead._id,
              campaign_lead_id: campaignLead._id,
              email: lead.email,
              phone: lead.phone,
              name: `${lead.first_name} ${lead.last_name}`.trim()
            });
          } else {
            savedContacts.push({
              lead_id: lead._id,
              campaign_lead_id: existingCampaignLead._id,
              email: lead.email,
              phone: lead.phone,
              name: `${lead.first_name} ${lead.last_name}`.trim(),
              note: 'Already in campaign'
            });
          }
        } catch (contactError) {
          console.error('Error saving individual contact:', contactError);
          errors.push({ 
            contact: { email: contact.email, name: contact.name }, 
            error: contactError.message 
          });
        }
      }

      const response = { 
        success: true, 
        message: `Successfully processed ${savedContacts.length} of ${contacts.length} contacts`,
        data: savedContacts
      };
      
      if (errors.length > 0) {
        response.errors = errors;
      }

      res.json(response);
      
    } catch (error) {
      console.error('Save contacts error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to save contacts: ' + error.message 
      });
    }
  }
};