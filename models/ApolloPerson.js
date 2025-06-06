const mongoose = require('mongoose');

const EmploymentHistorySchema = new mongoose.Schema({
  current: Boolean,
  start_date: Date,
  end_date: Date,
  title: String,
  organization_id: String,
  organization_name: String,
  id: String,
  key: String,
});

const OrganizationSchema = new mongoose.Schema({
  id: String,
  name: String,
  linkedin_url: String,
  linkedin_uid: String,
  founded_year: Number,
  logo_url: String,
  industry: String,
  estimated_num_employees: Number,
  keywords: [String],
  industries: [String],
  short_description: String,
  city: String,
  state: String,
  country: String,
});

const PersonSchema = new mongoose.Schema({
  id: String,
  first_name: String,
  last_name: String,
  name: String,
  linkedin_url: String,
  title: String,
  email_status: String,
  photo_url: String,
  email: String,
  phone_number: String,
  headline: String,
  state: String,
  city: String,
  country: String,
  seniority: String,
  departments: [String],
  subdepartments: [String],
  organization_id: String,
  employment_history: [EmploymentHistorySchema],
  organization: OrganizationSchema
}, { timestamps: true });

module.exports = mongoose.model('Person', PersonSchema);
