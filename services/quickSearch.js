const Campaign = require("../models/Campaign");
const CampaignLead = require('../models/CampaignLead');
const Lead = require("../models/Lead");
const MessageHistory = require("../models/MessageHistory");

const mongoose = require("mongoose");

async function findRecords(req, res) {
  const filterBy = req.query.filterBy;
  const value = req.query.value;
  const modelName = req.route.path.replace(/^\/find-/, "");

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;

  // Get sortBy and sortOrder from query parameters
  const sortBy = req.query.sortBy || "starting_no";
  const sortOrder = req.query.sortOrder == "desc" ? -1 : 1;

  // Get year range from query parameters
  const fromYear = parseInt(req.query.fromYear);
  const toYear = parseInt(req.query.toYear);

  try {
    let model;

    switch (modelName) {
      case "campaign":
        model = Campaign;
        break;
      case "campaignLead":
        model = CampaignLead;
        break;
      case "lead":
        model = Lead;
        break;
      case "messageHistory":
        model = MessageHistory;
        break;
      // Add more cases if you have other models to handle
      default:
        return res
          .status(404)
          .json({ success: false, message: "Table not found" });
    }

    let query = {};

    if (filterBy && value) {
      // Split the value by commas and convert to an array
      const valuesArray = value.split(',').map(val => val.trim());

      // If the filter field is an ObjectId (e.g., for sub_category_id), convert values to ObjectId
      if (filterBy && value) {
        // Split the value by commas and convert to an array
        const valuesArray = value.split(',').map(val => val.trim());
        query[filterBy] = { $in: valuesArray };
      }
    }

    // Apply year range filter
    if (!isNaN(fromYear) || !isNaN(toYear)) {
      query.year = {};
      if (!isNaN(fromYear)) {
        query.year.$gte = fromYear;
      }
      if (!isNaN(toYear)) {
        query.year.$lte = toYear;
      }
    }

    const populate = req.query.populate;
    const paginatedData = await model
      .find(query)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(populate);

    const totalCount = await model.countDocuments(query);

    return res.status(200).json({
      success: true,
      total: totalCount,
      page,
      limit,
      data: paginatedData,
      message: "Successfully Fetched Data",
    });
  } catch (err) {
    console.log(err, "err");
    if (err instanceof mongoose.Error.StrictPopulateError) {
      return res.status(400).json({
        message: "Invalid populate field or model",
        error: err.message,
      });
    }
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
}

module.exports = { findRecords };
