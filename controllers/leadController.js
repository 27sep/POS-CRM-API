const Lead = require("../models/Lead");
const User = require("../models/User");
const fs = require("fs");
const csv = require("csv-parser");
const { sendBulkMail } = require("../utils/mailer");
const { sendBulkSMS } = require("../utils/sms");  


module.exports = {
  // Create a new lead
  createLead: async (req, res) => {
    const { first_name, last_name, email, phone, company, status, custom_fields, assigned_to, preferred_contact, source, lead_score } = req.body;

    if (assigned_to) {
      const userExists = await User.findById(assigned_to);
      if (!userExists) {
        return res.status(404).json({
          success: false,
          code: "USER_NOT_FOUND",
          message: "Assigned user not found",
        });
      }
    }

    try {
      const newLead = new Lead({
        first_name,
        last_name,
        email,
        phone,
        company,
        status,
        custom_fields,
        assigned_to,
        preferred_contact,
        source,
        lead_score,
      });

      await newLead.save();
      res.json({
        success: true,
        code: "LEAD_CREATED",
        message: "Lead created successfully",
        data: newLead,
      });
    } catch (err) {
      console.error("Error creating lead:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get all leads
  getAllLeads: async (req, res) => {
    try {
      const leads = await Lead.find();
      res.json({
        success: true,
        code: "LEADS_FETCHED",
        message: "Leads fetched successfully",
        data: leads,
      });
    } catch (err) {
      console.error("Error fetching leads:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get a lead by ID
  getLeadById: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          code: "LEAD_NOT_FOUND",
          message: "Lead not found",
        });
      }
      res.json({
        success: true,
        code: "LEAD_FETCHED",
        message: "Lead fetched successfully",
        data: lead,
      });
    } catch (err) {
      console.error("Error fetching lead:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Update a lead
  updateLead: async (req, res) => {
    const updates = req.body;

    try {
      let lead = await Lead.findById(req.params.id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          code: "LEAD_NOT_FOUND",
          message: "Lead not found",
        });
      }

      Object.keys(updates).forEach((key) => {
        lead[key] = updates[key];
      });

      await lead.save();
      res.json({
        success: true,
        code: "LEAD_UPDATED",
        message: "Lead updated successfully",
        data: lead,
      });
    } catch (err) {
      console.error("Error updating lead:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Delete a lead
  deleteLead: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.id);
      if (!lead) {
        return res.status(404).json({
          success: false,
          code: "LEAD_NOT_FOUND",
          message: "Lead not found",
        });
      }

      await Lead.findByIdAndDelete(req.params.id);
      res.json({
        success: true,
        code: "LEAD_DELETED",
        message: "Lead deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting lead:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },


  bulkImportLeads: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "CSV file is required",
        });
      }
  
      const leads = [];
      const filePath = req.file.path;
  
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => {
          leads.push(row);
        })
        .on("end", async () => {
          const savedLeads = [];
          const emailsToSend = [];
          const phoneNumbersToSend = [];
  
          for (let leadData of leads) {
            try {
              const {
                first_name,
                last_name,
                email,
                phone,
                company,
                status,
                custom_fields,
                assigned_to,
                preferred_contact,
                source,
                lead_score,
              } = leadData;
  
              let assignedUser = null;
              if (assigned_to) {
                assignedUser = await User.findById(assigned_to);
                if (!assignedUser) continue;
              }
  
              // Check and format the phone number if needed
              let formattedPhone = phone;
              if (formattedPhone && !formattedPhone.startsWith("+")) {
                // If no country code is found, prepend '+91' (India)
                formattedPhone = `+91${formattedPhone}`;
              }
  
              const newLead = new Lead({
                first_name,
                last_name,
                email,
                phone: formattedPhone, // Store the formatted phone number
                company,
                status,
                custom_fields: custom_fields ? JSON.parse(custom_fields) : {},
                assigned_to: assignedUser ? assignedUser._id : null,
                preferred_contact,
                source,
                lead_score,
              });
  
              const saved = await newLead.save();
              savedLeads.push(saved);
  
              if (email) emailsToSend.push(email);
              if (formattedPhone) phoneNumbersToSend.push(formattedPhone);
            } catch (err) {
              console.error("Error saving lead:", err.message);
              continue;
            }
          }
  
          fs.unlinkSync(filePath);
  
          // ✉️ Send bulk emails
          if (emailsToSend.length > 0) {
            try {
              await sendBulkMail(
                emailsToSend,
                "Welcome to our CRM!",
                `<p>Hello! You’ve been added to our CRM system. We’ll keep in touch!</p>`
              );
            } catch (mailErr) {
              console.error("Failed to send some emails:", mailErr.message);
            }
          }
  
          // 📲 Send bulk SMS
          if (phoneNumbersToSend.length > 0) {
            try {
              await sendBulkSMS(
                phoneNumbersToSend,
                "Hi! You’ve been added to our CRM. Stay tuned for updates."
              );
            } catch (smsErr) {
              console.error("Failed to send some SMS:", smsErr.message);
            }
          }
  
          res.status(200).json({
            success: true,
            code: "LEADS_IMPORTED",
            message: `${savedLeads.length} leads imported successfully, emails & SMS sent.`,
            data: savedLeads,
          });
        });
    } catch (err) {
      console.error("Bulk upload error:", err.message);
      res.status(500).json({
        success: false,
        message: "Server Error during bulk upload",
      });
    }
  },
  
  
}
