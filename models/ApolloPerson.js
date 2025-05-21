const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
  apollo_id: { type: String, required: true, unique: true },
  first_name: String,
  last_name: String,
  name: String,
  linkedin_url: String,
  title: String,
  email: String,
  email_status: String,
  photo_url: String,
  headline: String,
  state: String,
  city: String,
  country: String,
  seniority: String,

  organization: {
    name: String,
    website_url: String,
    linkedin_url: String,
    primary_phone: String,
    logo_url: String,
    primary_domain: String
  },

  employment_history: [{
    organization_name: String,
    title: String,
    start_date: Date,
    end_date: Date,
    current: Boolean
  }],

  last_updated: { type: Date, default: Date.now }
});


const Person = mongoose.model('Person', personSchema);

module.exports = Person;