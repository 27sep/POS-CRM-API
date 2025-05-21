const mongoose = require("mongoose");
const Person = require("../models/ApolloPerson");

module.exports = {
  // Create a new person
  createPerson: async (req, res) => {
    try {
      const personData = req.body;

      const newPerson = new Person(personData);
      await newPerson.save();

      res.json({
        success: true,
        code: "PERSON_CREATED",
        message: "Person created successfully",
        data: newPerson,
      });
    } catch (err) {
      console.error("Error creating person:", err.message);

      if (err.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          code: "VALIDATION_ERROR",
          message: err.message,
        });
      }

      if (err.code === 11000 && err.keyPattern?.apollo_id) {
        return res.status(409).json({
          success: false,
          code: "DUPLICATE_APOLLO_ID",
          message: "A person with this Apollo ID already exists",
        });
      }

      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get all persons
  getAllPersons: async (req, res) => {
    try {
      const persons = await Person.find();
      res.json({
        success: true,
        code: "PERSONS_FETCHED",
        message: "Persons fetched successfully",
        data: persons,
      });
    } catch (err) {
      console.error("Error fetching persons:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Get person by ID
  getPersonById: async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ID",
        message: "Invalid person ID",
      });
    }

    try {
      const person = await Person.findById(id);
      if (!person) {
        return res.status(404).json({
          success: false,
          code: "PERSON_NOT_FOUND",
          message: "Person not found",
        });
      }

      res.json({
        success: true,
        code: "PERSON_FETCHED",
        message: "Person fetched successfully",
        data: person,
      });
    } catch (err) {
      console.error("Error fetching person:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Update person
  updatePerson: async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ID",
        message: "Invalid person ID",
      });
    }

    try {
      let person = await Person.findById(id);
      if (!person) {
        return res.status(404).json({
          success: false,
          code: "PERSON_NOT_FOUND",
          message: "Person not found",
        });
      }

      Object.keys(updates).forEach((key) => {
        person[key] = updates[key];
      });

      await person.save();

      res.json({
        success: true,
        code: "PERSON_UPDATED",
        message: "Person updated successfully",
        data: person,
      });
    } catch (err) {
      console.error("Error updating person:", err.message);

      if (err.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          code: "VALIDATION_ERROR",
          message: err.message,
        });
      }

      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },

  // Delete person
  deletePerson: async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ID",
        message: "Invalid person ID",
      });
    }

    try {
      const person = await Person.findById(id);
      if (!person) {
        return res.status(404).json({
          success: false,
          code: "PERSON_NOT_FOUND",
          message: "Person not found",
        });
      }

      await Person.findByIdAndDelete(id);

      res.json({
        success: true,
        code: "PERSON_DELETED",
        message: "Person deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting person:", err.message);
      res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server Error",
      });
    }
  },
};
