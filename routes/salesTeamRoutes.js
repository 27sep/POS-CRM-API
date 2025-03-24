// routes/salesTeamRoutes.js
const express = require("express");
const router = express.Router();
const salesTeamController = require("../controllers/salesTeamController");

// Create a sales team
router.post("/create", salesTeamController.createSalesTeam);

// Get all sales teams
router.get("/all", salesTeamController.getAllSalesTeams);

// Get sales team by ID
router.get("/get/:id", salesTeamController.getSalesTeamById);

// Update sales team
router.put("/update/:id", salesTeamController.updateSalesTeam);

// Delete sales team
router.delete("/delete/:id", salesTeamController.deleteSalesTeam);

module.exports = router;
