const axios = require('axios');
const Person = require('../models/ApolloPerson');

const APOLLO_API_KEY = 'PGD-XmtalEwFgU5IiPtLqw';
const WEBHOOK_URL = encodeURIComponent('https://webhook.site/77fcaad8-17c7-4660-b954-706556204b9f');

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache',
  'x-api-key': APOLLO_API_KEY,
};

const fetchAndSavePeople = async (req, res) => {
  try {

    // Step 1: Call Apollo People Search API
    const {
      person_locations = ['Florida, United States'],
      page = 1,
      per_page = 10
    } = req.query;

    const locationsArray = typeof person_locations === 'string'
      ? [person_locations]
      : person_locations;

    const searchRes = await axios.post(
      'https://api.apollo.io/api/v1/mixed_people/search?reveal_personal_emails=true&reveal_phone_number=true',
      {
        person_locations: locationsArray,
        page: Number(page),
        per_page: Number(per_page),
      },
      { headers }
    );
    const people = searchRes.data.people;

    if (!people || !people.length) {
      return res.status(404).json({ message: 'No people found in search.' });
    }

    const enrichedResults = [];
    const skippedRecords = [];

    // Step 2: Loop through each person ID and enrich
    for (const person of people) {
      try {
        // First check if person already exists in DB
        const existingPerson = await Person.findOne({ id: person.id });

        if (existingPerson) {
          skippedRecords.push(person);
          continue; // Skip this person as they already exist
        }

        const enrichRes = await axios.post(
          `https://api.apollo.io/api/v1/people/enrich?reveal_personal_emails=true&reveal_phone_number=true&webhook_url=${WEBHOOK_URL}`,
          {
            person_id: person.id,
          },
          { headers }
        );

        const enrichedPerson = enrichRes.data.person;

        if (!enrichedPerson) continue;

        // Transform the data to match your schema
        const personData = {
          id: enrichedPerson.id,
          first_name: enrichedPerson.first_name,
          last_name: enrichedPerson.last_name,
          name: enrichedPerson.name,
          linkedin_url: enrichedPerson.linkedin_url,
          title: enrichedPerson.title,
          email_status: enrichedPerson.email_status,
          photo_url: enrichedPerson.photo_url,
          email: enrichedPerson.email,
          phone_number: enrichedPerson.phone_number,
          headline: enrichedPerson.headline,
          state: enrichedPerson.state,
          city: enrichedPerson.city,
          country: enrichedPerson.country,
          seniority: enrichedPerson.seniority,
          departments: enrichedPerson.departments,
          subdepartments: enrichedPerson.subdepartments,
          organization_id: enrichedPerson.organization_id,
          employment_history: enrichedPerson.employment_history.map(job => ({
            current: job.current,
            start_date: job.start_date,
            end_date: job.end_date,
            title: job.title,
            organization_id: job.organization_id,
            organization_name: job.organization_name,
            id: job.id,
            key: job.key
          })),
          organization: enrichedPerson.organization ? {
            id: enrichedPerson.organization.id,
            name: enrichedPerson.organization.name,
            linkedin_url: enrichedPerson.organization.linkedin_url,
            linkedin_uid: enrichedPerson.organization.linkedin_uid,
            founded_year: enrichedPerson.organization.founded_year,
            logo_url: enrichedPerson.organization.logo_url,
            industry: enrichedPerson.organization.industry,
            estimated_num_employees: enrichedPerson.organization.estimated_num_employees,
            keywords: enrichedPerson.organization.keywords || [],
            industries: enrichedPerson.organization.industries || [],
            short_description: enrichedPerson.organization.short_description,
            city: enrichedPerson.organization.city,
            state: enrichedPerson.organization.state,
            country: enrichedPerson.organization.country
          } : null
        };

        // Step 3: Save in MongoDB
        const saved = await Person.create(personData);
        enrichedResults.push(saved);
      } catch (enrichErr) {
        console.error(`Failed to process person ${person.id}:`, enrichErr.message);
      }
    }

    res.status(200).json({
      message: `${enrichedResults.length} new people enriched and saved. ${skippedRecords.length} existing records skipped.`,
      data: enrichedResults,
      skipped: skippedRecords,
    });
  } catch (err) {
    console.error('Error in fetchAndSavePeople:', err.message);
    res.status(500).json({ error: 'Failed to fetch and save people.' });
  }
};

module.exports = { fetchAndSavePeople };