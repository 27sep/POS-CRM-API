const SalesTeam = require('../models/SalesTeam');
const User = require('../models/User');

module.exports = {
  // Create a new sales team
  createSalesTeam: async (req, res) => {
    const { team_name, manager_id } = req.body;

    try {
      const managerExists = await User.findById(manager_id);
      if (!managerExists) {
        return res.status(404).json({
          success: false,
          code: 'MANAGER_NOT_FOUND',
          message: 'Manager not found',
        });
      }

      const newTeam = new SalesTeam({ team_name, manager_id });
      await newTeam.save();

      res.json({
        success: true,
        code: 'TEAM_CREATED',
        message: 'Sales team created successfully',
        data: newTeam,
      });
    } catch (err) {
      console.error('Error creating sales team:', err.message);
      res.status(500).json({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Server Error',
      });
    }
  },

  // Get all sales teams
  getAllSalesTeams: async (req, res) => {
    try {
      const teams = await SalesTeam.find().populate('manager_id');
      res.json({
        success: true,
        code: 'TEAMS_FETCHED',
        message: 'Sales teams fetched successfully',
        data: teams,
      });
    } catch (err) {
      console.error('Error fetching sales teams:', err.message);
      res.status(500).json({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Server Error',
      });
    }
  },

  // Get a sales team by ID
  getSalesTeamById: async (req, res) => {
    try {
      const team = await SalesTeam.findById(req.params.id).populate('manager_id');
      if (!team) {
        return res.status(404).json({
          success: false,
          code: 'TEAM_NOT_FOUND',
          message: 'Sales team not found',
        });
      }
      res.json({
        success: true,
        code: 'TEAM_FETCHED',
        message: 'Sales team fetched successfully',
        data: team,
      });
    } catch (err) {
      console.error('Error fetching sales team:', err.message);
      res.status(500).json({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Server Error',
      });
    }
  },

  // Update a sales team
  updateSalesTeam: async (req, res) => {
    const updates = req.body;

    try {
      let team = await SalesTeam.findById(req.params.id);
      if (!team) {
        return res.status(404).json({
          success: false,
          code: 'TEAM_NOT_FOUND',
          message: 'Sales team not found',
        });
      }

      Object.keys(updates).forEach((key) => {
        team[key] = updates[key];
      });

      await team.save();
      res.json({
        success: true,
        code: 'TEAM_UPDATED',
        message: 'Sales team updated successfully',
        data: team,
      });
    } catch (err) {
      console.error('Error updating sales team:', err.message);
      res.status(500).json({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Server Error',
      });
    }
  },

  // Delete a sales team
  deleteSalesTeam: async (req, res) => {
    try {
      const team = await SalesTeam.findById(req.params.id);
      if (!team) {
        return res.status(404).json({
          success: false,
          code: 'TEAM_NOT_FOUND',
          message: 'Sales team not found',
        });
      }

      await SalesTeam.findByIdAndDelete(req.params.id);
      res.json({
        success: true,
        code: 'TEAM_DELETED',
        message: 'Sales team deleted successfully',
      });
    } catch (err) {
      console.error('Error deleting sales team:', err.message);
      res.status(500).json({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Server Error',
      });
    }
  },
};