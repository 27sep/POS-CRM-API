const axios = require('axios');

// CONFIG
const API_KEY = 'PGD-XmtalEwFgU5IiPtLqw'; // Replace with your real API key
const SEARCH_URL = 'https://api.apollo.io/api/v1/mixed_people/search';
const ENRICH_URL = 'https://api.apollo.io/api/v1/people/enrich';
const WEBHOOK_URL = 'https://webhook.site/77fcaad8-17c7-4660-b954-706556204b9f'; // Replace if needed

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache',
  'x-api-key': API_KEY,
};

const SEARCH_PARAMS = {
  person_locations: ['Florida, United States'], // Modify location if needed
  page: 1,
  per_page: 10,
};

async function searchPeople(page) {
  try {
    SEARCH_PARAMS.page = page;
    const url = `${SEARCH_URL}?reveal_personal_emails=true&reveal_phone_number=true`;

    const response = await axios.post(url, SEARCH_PARAMS, { headers: HEADERS });

    console.log(`🔍 Full Search Response for Page ${page}:`);
    console.dir(response.data, { depth: null });

    return response.data.people || [];
  } catch (error) {
    console.error(`[ERROR] Search API failed on page ${page}:`, error.response?.status, error.response?.data || error.message);
    return [];
  }
}

async function enrichContact(personId) {
  try {
    const payload = { person_id: personId };
    const url = `${ENRICH_URL}?reveal_personal_emails=true&reveal_phone_number=true&webhook_url=${WEBHOOK_URL}`;

    const response = await axios.post(url, payload, { headers: HEADERS });

    console.log(`📦 Full Enrich Response for ID ${personId}:`);
    console.dir(response.data, { depth: null });

    return response.data;
  } catch (error) {
    console.error(`[ERROR] Enrich failed for ID ${personId}:`, error.response?.status, error.response?.data || error.message);
    return null;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const maxPages = 5;

  for (let page = 1; page <= maxPages; page++) {
    console.log(`\n🔍 Searching page ${page}...`);
    const people = await searchPeople(page);

    if (!people.length) {
      console.log('No more people found.');
      break;
    }

    for (const person of people) {
      const personId = person.id;
      const fullName = `${person.first_name} ${person.last_name}`;
      console.log(`👤 Enriching: ${fullName} (ID: ${personId})`);

      const enriched = await enrichContact(personId);
      if (enriched) {
        const phone = enriched?.person?.mobile_phone || 'N/A';
        const email = enriched?.person?.email || 'N/A';
        console.log(`📞 Phone: ${phone} | 📧 Email: ${email}`);
      }

      await delay(500); // Prevent rate limits
    }
  }
}

main();
