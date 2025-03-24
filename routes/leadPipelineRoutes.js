// routes/leadPipelineRoutes.js
const express = require("express");
const router = express.Router();
const leadPipelineController = require("../controllers/leadPipelineController");

// Create a new pipeline stage
router.post("/create", leadPipelineController.createLeadPipeline);

// Get all pipeline stages
router.get("/all", leadPipelineController.getAllLeadPipelines);

// Get pipeline stage by ID
router.get("/get/:id", leadPipelineController.getLeadPipelineById);

// Update a pipeline stage
router.put("/update/:id", leadPipelineController.updateLeadPipeline);

// Delete a pipeline stage
router.delete("/delete/:id", leadPipelineController.deleteLeadPipeline);

module.exports = router;
